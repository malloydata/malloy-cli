/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

// Import for side-effect of registering all connection types.
// This must happen before any MalloyConfig is constructed so
// that the registry is populated for includeDefaultConnections
// and connection creation from config entries.
import '@malloydata/malloy-connections';
