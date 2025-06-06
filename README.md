


          
# Event Management API

Documentação simples para executar a aplicação em Docker e realizar testes.

## Como executar com Docker

### 1. Parar containers existentes e limpar volumes
```bash
docker-compose down -v
```

### 2. Construir e iniciar os containers
```bash
docker-compose up --build
```

### 3. Executar migrações do banco de dados
```bash
docker exec -it event-api npx prisma migrate deploy
```

### 4. Popular o banco com dados iniciais
```bash
docker exec -it event-api npx prisma db seed
```

### 5. Verificar se a API está funcionando
```bash
docker exec -it event-api curl http://localhost:3000/health
```

### 6. Verificar tabelas criadas no banco (opcional)
```bash
docker exec -it event-db psql -U postgres -d events -c '\dt'
```

## Reiniciar a API (se necessário)
```bash
docker restart event-api
```

## Parar completamente
```bash
docker-compose down -v
```

## Documentação da API

Para testar e entender todos os endpoints disponíveis, utilize a **collection** fornecida como documentação principal da API. A collection contém exemplos de todas as requisições disponíveis com os parâmetros necessários.

## Estrutura dos Containers

- `event-api`: Container da aplicação Node.js
- `event-db`: Container do banco PostgreSQL
- `event-redis`: Container do Redis para cache

## Portas

- API: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
        