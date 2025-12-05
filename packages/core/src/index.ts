// Types
export * from './types.js';

// Config
export {
  loadConfig,
  saveConfig,
  configExists,
  getConfigPath,
  createDefaultConfig,
} from './config.js';

// Keystore
export {
  storeSecret,
  getSecret,
  deleteSecret,
  listSecretKeys,
  hasSecret,
  getKeystoreInfo,
} from './keystore.js';

// Environment
export {
  updateEnvFile,
  readEnvFile,
  parseEnvFile,
  serializeEnvFile,
  envFileExists,
  ensureGitignoreHasEnv,
} from './env.js';

// Detection
export {
  detectFramework,
  suggestProjectName,
  getInstalledDependencies,
} from './detect.js';

// Code generation
export {
  generateClientCode,
  generateAllClients,
  getInstallCommand,
} from './codegen.js';

// Providers
export {
  PROVIDERS,
  getProvider,
  listProviders,
  getProviderByEnvVar,
} from './providers.js';
