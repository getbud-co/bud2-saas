package permission

type Group string

const (
	GroupPeople    Group = "people"
	GroupMissions  Group = "missions"
	GroupSurveys   Group = "surveys"
	GroupSettings  Group = "settings"
	GroupAssistant Group = "assistant"
)

func (g Group) IsValid() bool {
	return g == GroupPeople || g == GroupMissions || g == GroupSurveys || g == GroupSettings || g == GroupAssistant
}

type Permission struct {
	ID          string
	Group       Group
	Label       string
	Description string
}

// Catalog returns the 21 permissions available in the system.
// Source mirrored from frontend/src/lib/config-store.ts (buildPermissions).
func Catalog() []Permission {
	out := make([]Permission, len(catalog))
	copy(out, catalog)
	return out
}

var catalog = []Permission{
	{ID: "people.view", Group: GroupPeople, Label: "Visualizar", Description: "Ver informações de colaboradores"},
	{ID: "people.create", Group: GroupPeople, Label: "Criar", Description: "Adicionar novos colaboradores"},
	{ID: "people.edit", Group: GroupPeople, Label: "Editar", Description: "Alterar dados de colaboradores"},
	{ID: "people.deactivate", Group: GroupPeople, Label: "Desativar", Description: "Desativar contas de colaboradores"},
	{ID: "missions.view", Group: GroupMissions, Label: "Visualizar", Description: "Ver missões e OKRs"},
	{ID: "missions.create", Group: GroupMissions, Label: "Criar", Description: "Criar novas missões e OKRs"},
	{ID: "missions.edit", Group: GroupMissions, Label: "Editar", Description: "Alterar missões e OKRs existentes"},
	{ID: "missions.delete", Group: GroupMissions, Label: "Excluir", Description: "Remover missões e OKRs"},
	{ID: "missions.assign", Group: GroupMissions, Label: "Atribuir", Description: "Atribuir missões a colaboradores"},
	{ID: "surveys.view", Group: GroupSurveys, Label: "Visualizar", Description: "Ver pesquisas disponíveis"},
	{ID: "surveys.create", Group: GroupSurveys, Label: "Criar", Description: "Criar novas pesquisas"},
	{ID: "surveys.edit", Group: GroupSurveys, Label: "Editar", Description: "Alterar pesquisas existentes"},
	{ID: "surveys.publish", Group: GroupSurveys, Label: "Publicar", Description: "Publicar pesquisas para respondentes"},
	{ID: "surveys.results", Group: GroupSurveys, Label: "Ver resultados", Description: "Acessar resultados e análises"},
	{ID: "settings.access", Group: GroupSettings, Label: "Acessar", Description: "Visualizar configurações da plataforma"},
	{ID: "settings.edit", Group: GroupSettings, Label: "Editar", Description: "Alterar configurações da plataforma"},
	{ID: "assistant.tone", Group: GroupAssistant, Label: "Tom de voz", Description: "Escolher e criar tons de voz personalizados"},
	{ID: "assistant.language", Group: GroupAssistant, Label: "Idioma", Description: "Alterar idioma do assistente"},
	{ID: "assistant.suggestions", Group: GroupAssistant, Label: "Sugestões", Description: "Configurar nível de proatividade e tipos de sugestão"},
	{ID: "assistant.transparency", Group: GroupAssistant, Label: "Transparência", Description: "Configurar modo de explicação da IA"},
	{ID: "assistant.llm", Group: GroupAssistant, Label: "LLM própria", Description: "Conectar provedores de IA pessoais"},
}
