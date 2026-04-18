# ADR-003: Pattern Handler-UseCase com Command e Execute

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

É necessário definir como handler (transport HTTP) e use case (lógica de negócio) se comunicam. A Clean Architecture de Robert Martin descreve Input Boundary, Output Boundary e Presenter como camadas intermediárias. Para um projeto Go com chi/net/http, precisamos de um pattern pragmático que respeite a Dependency Rule sem burocracia desnecessária.

## Decisão

### Use Case

- Cada use case possui **um único método `Execute`**.
- `Execute` recebe um **Command** (struct com os dados necessários) ou primitivos simples (quando ≤ 3 parâmetros).
- `Execute` retorna **entidades de domínio ou primitivos**, nunca DTOs de response HTTP.
- Um use case = uma ação de negócio (ex: `CreateUser`, `ListOrders`).

```go
type CreateUserCommand struct {
    Name  string
    Email string
}

type CreateUser struct {
    repo domain.UserRepository
}

func (uc *CreateUser) Execute(ctx context.Context, cmd CreateUserCommand) (*domain.User, error) {
    user := domain.NewUser(cmd.Name, cmd.Email)
    if err := uc.repo.Save(ctx, user); err != nil {
        return nil, err
    }
    return user, nil
}
```

### Handler

- Parsea o HTTP request (body, params, headers).
- Monta o Command e chama `usecase.Execute(command)`.
- Recebe entidade/primitivo de volta.
- Transforma em Response DTO e escreve o HTTP response.
- Pode orquestrar múltiplos use cases quando necessário.

```go
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest  // DTO de request
    // ... parse body into req

    cmd := usecase.CreateUserCommand{
        Name:  req.Name,
        Email: req.Email,
    }

    user, err := h.createUser.Execute(r.Context(), cmd)
    // ... handle error

    resp := UserResponse{ID: user.ID, Name: user.Name}  // DTO de response
    // ... write JSON response
}
```

### Regras

1. **Entidades de domínio nunca têm tags `json:`** — serialização é responsabilidade do DTO no handler.
2. **Use case nunca importa pacotes HTTP** — não conhece request nem response.
3. **Handler pode conhecer entidades de domínio** — a dependência handler → domain respeita a Dependency Rule (de fora para dentro).
4. **Command struct apenas quando > 3 parâmetros** — com 1-3 primitivos, passar diretamente como argumentos.
5. **Sem Application Service prematuro** — se a mesma orquestração de múltiplos use cases aparecer em 2+ handlers, extrair para um Application Service. Até lá, o handler orquestra diretamente.

## Consequências

**Positivas:**
- Use cases com `Execute` são naturalmente testáveis — mock do repository, chama Execute, verifica resultado.
- Interface de método único é idiomática em Go e permite composição via interfaces implícitas.
- Sem Presenter/Output Boundary simplifica o código sem perder a separação de responsabilidades.
- Handler como orquestrador mantém a flexibilidade sem camada intermediária prematura.

**Negativas:**
- Handler é mais "gordo" do que no pattern com Presenter — ele conhece tanto Command quanto entidades.
- Se um handler crescer demais orquestrando muitos use cases, é sinal de que um Application Service é necessário (mas esse é o critério de ativação, não um problema).

## Critério de ativação para Application Service

Introduzir `internal/appservice/` quando:
- A mesma sequência de use cases for chamada em 2+ handlers.
- Houver lógica condicional de negócio **entre** chamadas de use cases (ex: "se o pedido for internacional, chamar use case de câmbio antes do use case de pagamento").

## Alternativas Consideradas

- **Presenter pattern (Martin)**: Output Boundary + Presenter entre use case e handler. Descartado por adicionar indireção sem benefício proporcional em um projeto Go com um único ponto de entrada HTTP.
- **Use case retorna DTO de response**: Descartado porque acopla o use case ao formato de transporte — impossibilita reutilizar o mesmo use case em CLI, gRPC, ou eventos.
- **CQRS completo**: Command/Query segregation com buses. Descartado por ser prematuro — pode ser introduzido incrementalmente se a complexidade justificar.

## Referências

- Robert C. Martin, "Clean Architecture" (2017), Cap. 22-23
- Go interfaces: "Accept interfaces, return structs"
