export interface Endereco {
    cep: string;
    rua: string;
    numero: number;
    complemento?: string; // Opcional conforme Swagger
    cidade: string;
    estado: string;
  }