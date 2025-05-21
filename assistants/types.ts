export interface AssistantConfig {
    id: string;
    name: string;
    description: string;
    tone: string;
    vaultScope: string[];
    systemPrompt: (vault: any) => string;
  }