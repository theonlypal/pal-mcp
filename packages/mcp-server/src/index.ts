#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadConfig,
  configExists,
  saveConfig,
  createDefaultConfig,
  readEnvFile,
  updateEnvFile,
  getProvider,
  listProviders,
  storeSecret,
  getSecret,
  hasSecret,
  generateClientCode,
  detectFramework,
  getKeystoreInfo,
  type PalConfig,
  type ServiceConfig,
} from '@pal/core';

// PAL projects registry file
const PROJECTS_FILE = path.join(os.homedir(), '.pal', 'projects.json');

interface ProjectsRegistry {
  projects: {
    name: string;
    path: string;
    addedAt: string;
  }[];
}

function loadProjectsRegistry(): ProjectsRegistry {
  const dir = path.dirname(PROJECTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(PROJECTS_FILE)) {
    return { projects: [] };
  }

  const content = fs.readFileSync(PROJECTS_FILE, 'utf-8');
  return JSON.parse(content) as ProjectsRegistry;
}

function saveProjectsRegistry(registry: ProjectsRegistry): void {
  const dir = path.dirname(PROJECTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(registry, null, 2), 'utf-8');
}

function registerProject(projectPath: string, name: string): void {
  const registry = loadProjectsRegistry();
  const existing = registry.projects.findIndex(p => p.path === projectPath);

  if (existing >= 0) {
    registry.projects[existing].name = name;
  } else {
    registry.projects.push({
      name,
      path: projectPath,
      addedAt: new Date().toISOString(),
    });
  }

  saveProjectsRegistry(registry);
}

// Tool definitions
const tools: Tool[] = [
  {
    name: 'list_projects',
    description: 'List all PAL-registered projects with their configured API services',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'inspect_project',
    description: 'Get detailed information about a specific PAL project including services, env status, and health',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory. If not provided, uses current working directory.',
        },
      },
      required: [],
    },
  },
  {
    name: 'add_api_to_project',
    description: 'Add an API service configuration to a PAL project. Stores the API key securely.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        provider: {
          type: 'string',
          description: 'API provider ID (e.g., openai, anthropic, stripe)',
        },
        apiKey: {
          type: 'string',
          description: 'The API key to store securely',
        },
        envVarKey: {
          type: 'string',
          description: 'Custom environment variable name (optional, uses provider default if not specified)',
        },
        serviceId: {
          type: 'string',
          description: 'Custom service ID (optional, uses provider ID if not specified)',
        },
      },
      required: ['projectPath', 'provider', 'apiKey'],
    },
  },
  {
    name: 'generate_client_snippets',
    description: 'Generate client code snippets for configured API services in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
        provider: {
          type: 'string',
          description: 'Specific provider to generate code for (optional, generates all if not specified)',
        },
      },
      required: ['projectPath'],
    },
  },
  {
    name: 'summarize_env_state',
    description: 'Get a health summary of the environment file and key storage for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project directory',
        },
      },
      required: ['projectPath'],
    },
  },
];

// Tool implementations
async function listProjects(): Promise<object> {
  const registry = loadProjectsRegistry();

  const projectsWithDetails = await Promise.all(
    registry.projects.map(async (project) => {
      const exists = fs.existsSync(project.path);
      const hasPalConfig = exists && configExists(project.path);

      let services: string[] = [];
      if (hasPalConfig) {
        const config = loadConfig(project.path);
        services = config.services.map(s => s.provider);
      }

      return {
        name: project.name,
        path: project.path,
        exists,
        hasPalConfig,
        services,
        addedAt: project.addedAt,
      };
    })
  );

  return {
    totalProjects: projectsWithDetails.length,
    projects: projectsWithDetails,
    availableProviders: listProviders().map(p => ({
      id: p.id,
      name: p.name,
      envVar: p.defaultEnvVar,
    })),
  };
}

async function inspectProject(projectPath: string): Promise<object> {
  const resolvedPath = path.resolve(projectPath);

  if (!fs.existsSync(resolvedPath)) {
    return {
      error: `Project path does not exist: ${resolvedPath}`,
      suggestion: 'Verify the path exists and try again',
    };
  }

  if (!configExists(resolvedPath)) {
    return {
      error: `PAL is not initialized in this project`,
      path: resolvedPath,
      suggestion: 'Run `pal init` in the project directory or use Claude to initialize it',
    };
  }

  const config = loadConfig(resolvedPath);
  const framework = detectFramework(resolvedPath);
  const envVars = readEnvFile(resolvedPath, config.envFile);
  const keystoreInfo = getKeystoreInfo();

  // Check each service
  const servicesStatus = await Promise.all(
    config.services.map(async (service) => {
      const secretKey = `${config.projectName}:${service.id}`;
      const hasStoredKey = await hasSecret(secretKey);
      const envValue = envVars[service.envVarKey];
      const hasEnvValue = envValue &&
        envValue !== '' &&
        !envValue.includes('your_') &&
        !envValue.includes('_here');

      const provider = getProvider(service.provider);

      return {
        id: service.id,
        provider: service.provider,
        providerName: provider?.name || service.provider,
        envVarKey: service.envVarKey,
        hasStoredKey,
        hasEnvValue,
        status: hasStoredKey && hasEnvValue ? 'ready' :
          hasStoredKey ? 'needs-generate' :
            hasEnvValue ? 'key-not-in-keystore' : 'not-configured',
      };
    })
  );

  return {
    projectName: config.projectName,
    path: resolvedPath,
    language: config.language,
    framework: config.framework,
    detectedFramework: framework,
    envFile: config.envFile,
    keystore: {
      type: keystoreInfo.usingKeychain ? 'os-keychain' : 'encrypted-file',
      secure: keystoreInfo.usingKeychain,
    },
    services: servicesStatus,
    summary: {
      totalServices: servicesStatus.length,
      ready: servicesStatus.filter(s => s.status === 'ready').length,
      needsAttention: servicesStatus.filter(s => s.status !== 'ready').length,
    },
  };
}

async function addApiToProject(
  projectPath: string,
  providerId: string,
  apiKey: string,
  envVarKey?: string,
  serviceId?: string
): Promise<object> {
  const resolvedPath = path.resolve(projectPath);

  // Validate provider
  const provider = getProvider(providerId);
  if (!provider) {
    return {
      error: `Unknown provider: ${providerId}`,
      availableProviders: listProviders().map(p => p.id),
    };
  }

  // Ensure project exists
  if (!fs.existsSync(resolvedPath)) {
    return {
      error: `Project path does not exist: ${resolvedPath}`,
    };
  }

  // Initialize config if needed
  let config: PalConfig;
  if (!configExists(resolvedPath)) {
    const projectName = path.basename(resolvedPath);
    config = createDefaultConfig(projectName);
    const framework = detectFramework(resolvedPath);
    config.language = framework.hasTypeScript ? 'node' : 'node';
    config.framework = framework.framework === 'nextjs' ? 'nextjs' :
      framework.framework === 'express' ? 'express' : 'none';
    saveConfig(resolvedPath, config);
    registerProject(resolvedPath, projectName);
  } else {
    config = loadConfig(resolvedPath);
  }

  const finalServiceId = serviceId || providerId;
  const finalEnvVarKey = envVarKey || provider.defaultEnvVar;

  // Check if service already exists
  const existingIndex = config.services.findIndex(s => s.id === finalServiceId);
  if (existingIndex >= 0) {
    config.services.splice(existingIndex, 1);
  }

  // Store secret
  const secretKey = `${config.projectName}:${finalServiceId}`;
  await storeSecret(secretKey, apiKey);

  // Add service to config
  const serviceConfig: ServiceConfig = {
    id: finalServiceId,
    provider: providerId,
    envVarKey: finalEnvVarKey,
    scopes: provider.scopes,
  };

  config.services.push(serviceConfig);
  saveConfig(resolvedPath, config);

  // Update env file
  const envUpdates: Record<string, string> = {
    [finalEnvVarKey]: apiKey,
  };
  const envResult = updateEnvFile(resolvedPath, envUpdates, config.envFile);

  return {
    success: true,
    provider: provider.name,
    serviceId: finalServiceId,
    envVarKey: finalEnvVarKey,
    keyStored: true,
    envFileUpdated: envResult.updated.length > 0 || envResult.created,
    envFile: config.envFile,
    nextSteps: [
      `API key for ${provider.name} stored securely`,
      `Environment variable ${finalEnvVarKey} set in ${config.envFile}`,
      `You can now use generate_client_snippets to get integration code`,
    ],
  };
}

async function generateClientSnippets(
  projectPath: string,
  specificProvider?: string
): Promise<object> {
  const resolvedPath = path.resolve(projectPath);

  if (!configExists(resolvedPath)) {
    return {
      error: `PAL is not initialized in this project`,
      suggestion: 'Initialize PAL first using add_api_to_project or run `pal init`',
    };
  }

  const config = loadConfig(resolvedPath);
  const framework = detectFramework(resolvedPath);

  let servicesToGenerate = config.services;
  if (specificProvider) {
    servicesToGenerate = config.services.filter(s => s.provider === specificProvider);
    if (servicesToGenerate.length === 0) {
      return {
        error: `Provider ${specificProvider} not configured in this project`,
        configuredProviders: config.services.map(s => s.provider),
      };
    }
  }

  const snippets = servicesToGenerate.map(service => {
    const result = generateClientCode(service, framework.hasTypeScript);
    const provider = getProvider(service.provider);

    return {
      provider: service.provider,
      providerName: provider?.name || service.provider,
      filename: result.path,
      language: framework.hasTypeScript ? 'typescript' : 'javascript',
      code: result.content,
      envVarKey: service.envVarKey,
      installCommand: provider?.sdkPackage ?
        `${framework.packageManager} ${framework.packageManager === 'npm' ? 'install' : 'add'} ${provider.sdkPackage}` :
        null,
    };
  });

  return {
    projectName: config.projectName,
    framework: framework.framework,
    hasTypeScript: framework.hasTypeScript,
    snippets,
    instructions: [
      'Copy the code snippets to your project',
      'Install the required SDK packages',
      'Import and use the clients in your application',
    ],
  };
}

async function summarizeEnvState(projectPath: string): Promise<object> {
  const resolvedPath = path.resolve(projectPath);

  if (!fs.existsSync(resolvedPath)) {
    return {
      error: `Project path does not exist: ${resolvedPath}`,
    };
  }

  if (!configExists(resolvedPath)) {
    // Check if there's an env file anyway
    const envPath = path.join(resolvedPath, '.env');
    if (fs.existsSync(envPath)) {
      const envVars = readEnvFile(resolvedPath);
      return {
        palInitialized: false,
        envFileExists: true,
        envFilePath: envPath,
        variableCount: Object.keys(envVars).length,
        suggestion: 'Run `pal init` to initialize PAL and manage these keys securely',
      };
    }
    return {
      palInitialized: false,
      envFileExists: false,
      suggestion: 'Run `pal init` to initialize PAL in this project',
    };
  }

  const config = loadConfig(resolvedPath);
  const envPath = path.join(resolvedPath, config.envFile);
  const envExists = fs.existsSync(envPath);
  const envVars = readEnvFile(resolvedPath, config.envFile);
  const keystoreInfo = getKeystoreInfo();

  // Check gitignore
  const gitignorePath = path.join(resolvedPath, '.gitignore');
  let envInGitignore = false;
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    envInGitignore = gitignore.includes(config.envFile) || gitignore.includes('.env');
  }

  // Analyze each configured service
  const serviceAnalysis = await Promise.all(
    config.services.map(async (service) => {
      const secretKey = `${config.projectName}:${service.id}`;
      const hasStoredKey = await hasSecret(secretKey);
      const envValue = envVars[service.envVarKey];

      let keyStatus: 'secure' | 'placeholder' | 'missing' | 'unknown' = 'unknown';
      if (hasStoredKey && envValue && !envValue.includes('your_')) {
        keyStatus = 'secure';
      } else if (envValue?.includes('your_') || envValue?.includes('_here')) {
        keyStatus = 'placeholder';
      } else if (!envValue) {
        keyStatus = 'missing';
      }

      return {
        service: service.id,
        provider: service.provider,
        envVar: service.envVarKey,
        inKeystore: hasStoredKey,
        inEnvFile: !!envValue,
        keyStatus,
      };
    })
  );

  const secureCount = serviceAnalysis.filter(s => s.keyStatus === 'secure').length;
  const needsAttention = serviceAnalysis.filter(s => s.keyStatus !== 'secure');

  return {
    projectName: config.projectName,
    palInitialized: true,
    envFile: {
      path: envPath,
      exists: envExists,
      inGitignore: envInGitignore,
      variableCount: Object.keys(envVars).length,
    },
    keystore: {
      type: keystoreInfo.usingKeychain ? 'os-keychain' : 'encrypted-file',
      secure: keystoreInfo.usingKeychain,
      path: keystoreInfo.path,
    },
    services: serviceAnalysis,
    health: {
      score: config.services.length > 0 ?
        Math.round((secureCount / config.services.length) * 100) : 100,
      secureServices: secureCount,
      totalServices: config.services.length,
      issues: needsAttention.map(s => ({
        service: s.service,
        issue: s.keyStatus === 'placeholder' ? 'Using placeholder value' :
          s.keyStatus === 'missing' ? 'Key not set' :
            'Unknown issue',
        fix: `Run \`pal add-api ${s.provider}\` to configure properly`,
      })),
    },
    recommendations: [
      !envInGitignore && envExists ? `Add ${config.envFile} to .gitignore for security` : null,
      !keystoreInfo.usingKeychain ? 'Install keytar for OS keychain integration (more secure)' : null,
      needsAttention.length > 0 ? `${needsAttention.length} service(s) need attention` : null,
    ].filter(Boolean),
  };
}

// Main server setup
async function main(): Promise<void> {
  const server = new Server(
    {
      name: 'pal-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: object;

      switch (name) {
        case 'list_projects':
          result = await listProjects();
          break;

        case 'inspect_project':
          result = await inspectProject(
            (args as { projectPath?: string }).projectPath || process.cwd()
          );
          break;

        case 'add_api_to_project': {
          const addArgs = args as {
            projectPath: string;
            provider: string;
            apiKey: string;
            envVarKey?: string;
            serviceId?: string;
          };
          result = await addApiToProject(
            addArgs.projectPath,
            addArgs.provider,
            addArgs.apiKey,
            addArgs.envVarKey,
            addArgs.serviceId
          );
          break;
        }

        case 'generate_client_snippets': {
          const genArgs = args as {
            projectPath: string;
            provider?: string;
          };
          result = await generateClientSnippets(
            genArgs.projectPath,
            genArgs.provider
          );
          break;
        }

        case 'summarize_env_state':
          result = await summarizeEnvState(
            (args as { projectPath: string }).projectPath
          );
          break;

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: errorMessage,
              tool: name,
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('PAL MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
