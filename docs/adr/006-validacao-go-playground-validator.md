# ADR-006: Validação de Input com go-playground/validator

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

Input inválido precisa ser rejeitado antes de chegar nos use cases. A posição da validação nas camadas e a biblioteca escolhida definem a ergonomia do desenvolvimento.

## Decisão

Adotar **go-playground/validator** para validação de formato nos DTOs de request do handler.

### Regra de posição

| Tipo de validação | Onde fica | Exemplo |
|-------------------|-----------|---------|
| Formato / estrutura | Handler (DTO de request) | email válido, campo obrigatório, tamanho máximo |
| Invariante de negócio | Domain entity / use case | email já cadastrado, saldo insuficiente |

```go
// DTO de request no handler — validação de formato
type CreateUserRequest struct {
    Name  string `json:"name"  validate:"required,min=2,max=100"`
    Email string `json:"email" validate:"required,email"`
}

// Use case nunca valida formato — só regras de negócio
func (uc *CreateUser) Execute(ctx context.Context, cmd CreateUserCommand) (*domain.User, error) {
    if uc.repo.EmailExists(ctx, cmd.Email) {
        return nil, domain.ErrEmailAlreadyTaken  // invariante de negócio
    }
    // ...
}
```

### Erro de validação

Erros de validação retornam HTTP 422 com lista de campos inválidos — nunca 400 genérico.

## Consequências

**Positivas:**
- Tags declarativas nos structs — sem boilerplate de validação manual.
- Suporte a validações customizadas via `RegisterValidation`.
- Biblioteca mais adotada no ecossistema Go para esse fim.

**Negativas:**
- Erros brutos do validator precisam ser mapeados para um formato de response padronizado — requer um helper no handler.

## Alternativas Consideradas

- **Validação manual**: Descartado pelo boilerplate em requests com muitos campos.
- **ozzo-validation**: Alternativa válida com API funcional, mas ecossistema menor.

## Referências

- github.com/go-playground/validator/v10
