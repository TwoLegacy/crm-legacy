import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Habilita export estático para deploy em hosting compartilhada
  output: 'export',
  
  // Desabilita otimização de imagem (não suportada em export estático)
  images: {
    unoptimized: true,
  },
  
  // Trailing slash para compatibilidade com servidores estáticos
  trailingSlash: true,
};

export default nextConfig;
