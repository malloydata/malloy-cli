import axios, { AxiosInstance, AxiosError } from 'axios';

export class PublisherClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(urlOverride?: string) {
    this.baseURL = this.resolveServerURL(urlOverride);
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      response => response,
      this.handleError.bind(this)
    );
  }

  private resolveServerURL(urlOverride?: string): string {
    return (
      urlOverride ||
      process.env.MALLOY_PUBLISHER_URL ||
      'http://localhost:4000'
    );
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      const message = (error.response.data as any)?.message || error.response.statusText;
      throw new Error(`Publisher API Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      throw new Error(
        `Cannot reach Publisher at ${this.baseURL}. Is the server running?`
      );
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }

  // Projects
  async listProjects(): Promise<any[]> {
    const response = await this.client.get('/api/v0/projects');
    return response.data;
  }

  async getProject(name: string): Promise<any> {
    const response = await this.client.get(`/api/v0/projects/${encodeURIComponent(name)}`);
    return response.data;
  }

  async createProject(name: string): Promise<any> {
    const response = await this.client.post('/api/v0/projects', { name });
    return response.data;
  }

  async updateProject(name: string, updates: { readme?: string; location?: string }): Promise<any> {
    console.log("name update project", name)
    const response = await this.client.patch(`/api/v0/projects/${encodeURIComponent(name)}`, updates);
    return response.data;
  }

  async deleteProject(name: string): Promise<void> {
    await this.client.delete(`/api/v0/projects/${encodeURIComponent(name)}`);
  }

  // Packages
  async listPackages(projectName: string): Promise<any[]> {
    const response = await this.client.get(
      `/api/v0/projects/${encodeURIComponent(projectName)}/packages`
    );
    return response.data;
  }

  async getPackage(projectName: string, packageName: string): Promise<any> {
    const response = await this.client.get(
      `/api/v0/projects/${encodeURIComponent(projectName)}/packages/${encodeURIComponent(packageName)}`
    );
    return response.data;
  }

  async createPackage(
    projectName: string,
    packageName: string,
    location: string,
    description?: string
  ): Promise<any> {
    const response = await this.client.post(
      `/api/v0/projects/${encodeURIComponent(projectName)}/packages`,
      { name: packageName, location, description }
    );
    return response.data;
  }

  async updatePackage(
    projectName: string,
    packageName: string,
    updates: { location?: string; description?: string }
  ): Promise<any> {
    const response = await this.client.patch(
      `/api/v0/projects/${encodeURIComponent(projectName)}/packages/${encodeURIComponent(packageName)}`,
      updates
    );
    return response.data;
  }

  async deletePackage(projectName: string, packageName: string): Promise<void> {
    await this.client.delete(
      `/api/v0/projects/${encodeURIComponent(projectName)}/packages/${encodeURIComponent(packageName)}`
    );
  }

  // Connections
  async listConnections(projectName: string): Promise<any[]> {
    const response = await this.client.get(
      `/api/v0/projects/${encodeURIComponent(projectName)}/connections`
    );
    return response.data;
  }

  async getConnection(projectName: string, connectionName: string): Promise<any> {
    const response = await this.client.get(
      `/api/v0/projects/${encodeURIComponent(projectName)}/connections/${encodeURIComponent(connectionName)}`
    );
    return response.data;
  }

  async createConnection(projectName: string, connection: any): Promise<any> {
    const response = await this.client.post(
      `/api/v0/projects/${encodeURIComponent(projectName)}/connections/${encodeURIComponent(connection.name)}`,
      connection
    );
    return response.data;
  }

  async updateConnection(
    projectName: string,
    connectionName: string,
    connection: any
  ): Promise<any> {
    const response = await this.client.patch(
      `/api/v0/projects/${encodeURIComponent(projectName)}/connections/${encodeURIComponent(connectionName)}`,
      connection
    );
    return response.data;
  }

  async deleteConnection(projectName: string, connectionName: string): Promise<void> {
    await this.client.delete(
      `/api/v0/projects/${encodeURIComponent(projectName)}/connections/${encodeURIComponent(connectionName)}`
    );
  }
}