import { useRef, useState, useMemo, type ChangeEvent } from "react";
import {
  Card,
  Input,
  Select,
  DatePicker,
  Button,
  Avatar,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  toast,
  PageHeader,
} from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import { Envelope, Key, FloppyDisk, SignOut, Camera, Trash } from "@phosphor-icons/react";
import type { Gender } from "@/types";
import { usePeopleData, type PeopleUserView } from "@/contexts/PeopleDataContext";
import { useConfigData } from "@/contexts/ConfigDataContext";
import styles from "./AccountPage.module.css";

const LANGUAGE_OPTIONS = [
  { value: "pt-br", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao-binario", label: "Não-binário" },
  { value: "prefiro-nao-dizer", label: "Prefiro não dizer" },
];

const AUTH_PROVIDER_LABEL: Record<string, string> = {
  email: "E-mail e senha",
  google: "Google",
  microsoft: "Microsoft",
  saml: "SSO (SAML)",
};

function parseBirthDate(dateStr: string | null): CalendarDate | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m, day: d };
}

function formatBirthDate(date: CalendarDate | null): string | null {
  if (!date) return null;
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function AccountPage() {
  const { users, currentUserId, setUsers } = usePeopleData();

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? null,
    [users, currentUserId],
  );

  if (!currentUser) return null;

  return <AccountForm user={currentUser} setUsers={setUsers} />;
}

interface AccountFormProps {
  user: PeopleUserView;
  setUsers: React.Dispatch<React.SetStateAction<PeopleUserView[]>>;
}

function AccountForm({ user, setUsers }: AccountFormProps) {
  const { roleOptions, resolveRoleSlug } = useConfigData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [email, setEmail] = useState(user.email);
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [birthDate, setBirthDate] = useState<CalendarDate | null>(parseBirthDate(user.birthDate));
  const [gender, setGender] = useState(user.gender ?? "");
  const [language, setLanguage] = useState(user.language);

  const roleLabel = useMemo(() => {
    const slug = resolveRoleSlug(user.roleType);
    return roleOptions.find((r) => r.value === slug)?.label ?? slug;
  }, [user.roleType, roleOptions, resolveRoleSlug]);

  const hasChanges = useMemo(() => {
    return (
      firstName !== user.firstName ||
      lastName !== user.lastName ||
      (nickname || "") !== (user.nickname || "") ||
      email !== user.email ||
      (jobTitle || "") !== (user.jobTitle || "") ||
      (phone || "") !== (user.phone || "") ||
      formatBirthDate(birthDate) !== (user.birthDate || null) ||
      (gender || "") !== (user.gender || "") ||
      language !== user.language
    );
  }, [firstName, lastName, nickname, email, jobTitle, phone, birthDate, gender, language, user]);

  function handleSave() {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              firstName,
              lastName,
              nickname: nickname || null,
              email,
              jobTitle: jobTitle || null,
              phone: phone || null,
              initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
              birthDate: formatBirthDate(birthDate),
              gender: (gender as Gender) || null,
              language,
              updatedAt: new Date().toISOString(),
            }
          : u,
      ),
    );
    toast.success("Dados atualizados com sucesso");
  }

  function handleDiscard() {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setNickname(user.nickname ?? "");
    setEmail(user.email);
    setJobTitle(user.jobTitle ?? "");
    setPhone(user.phone ?? "");
    setBirthDate(parseBirthDate(user.birthDate));
    setGender(user.gender ?? "");
    setLanguage(user.language);
  }

  function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setResetPasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Senha alterada com sucesso");
  }

  function handleAvatarUpload() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    setUsers((prev) =>
      prev.map((u) => u.id === user.id ? { ...u, avatarUrl: url, updatedAt: new Date().toISOString() } : u),
    );
    toast.success("Foto de perfil atualizada");
  }

  function handleAvatarRemove() {
    setAvatarUrl(null);
    setUsers((prev) =>
      prev.map((u) => u.id === user.id ? { ...u, avatarUrl: null, updatedAt: new Date().toISOString() } : u),
    );
    toast.success("Foto de perfil removida");
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Minha conta" />

      {/* ——— Profile overview ——— */}
      <Card>
        <div className={styles.sectionContent}>
          <div className={styles.profileRow}>
            <div className={styles.profileLeft}>
              <div className={styles.avatarWrapper}>
                <Avatar src={avatarUrl ?? undefined} initials={user.initials ?? `${firstName[0]}${lastName[0]}`.toUpperCase()} size="xl" />
                {avatarUrl ? (
                  <div className={styles.avatarOverlaySplit}>
                    <button type="button" className={styles.avatarOverlayHalf} onClick={handleAvatarUpload} aria-label="Substituir foto">
                      <Camera size={16} />
                    </button>
                    <button type="button" className={`${styles.avatarOverlayHalf} ${styles.avatarOverlayRemove}`} onClick={handleAvatarRemove} aria-label="Remover foto">
                      <Trash size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" className={styles.avatarOverlay} onClick={handleAvatarUpload} aria-label="Adicionar foto de perfil">
                    <Camera size={20} />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={styles.fileInput}
                  onChange={handleAvatarChange}
                />
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.profileName}>{firstName} {lastName}</span>
                <span className={styles.profileMeta}>{user.email}</span>
                {user.jobTitle && <span className={styles.profileMeta}>{user.jobTitle}</span>}
              </div>
            </div>
            <Badge color="neutral" size="md">{roleLabel}</Badge>
          </div>
        </div>
      </Card>

      {/* ——— Personal info ——— */}
      <Card>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Informações pessoais</span>
            <span className={styles.sectionDesc}>Gerencie seu nome, e-mail e dados pessoais.</span>
          </div>
          <div className={styles.formStack}>
            <div className={styles.formRow}>
              <Input label="Nome" value={firstName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} />
              <Input label="Sobrenome" value={lastName} onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <Input label="Apelido" value={nickname} onChange={(e: ChangeEvent<HTMLInputElement>) => setNickname(e.target.value)} placeholder="Como prefere ser chamado" />
              <Input label="E-mail" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} leftIcon={Envelope} />
            </div>
            <div className={styles.formRow}>
              <Input label="Cargo" value={jobTitle} onChange={(e: ChangeEvent<HTMLInputElement>) => setJobTitle(e.target.value)} placeholder="Ex: Product Manager" />
              <Input label="Telefone" value={phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className={styles.formRow}>
              <DatePicker mode="single" value={birthDate} onChange={setBirthDate} label="Data de nascimento" />
              <Select label="Gênero" value={gender} onChange={setGender} options={GENDER_OPTIONS} />
            </div>
            <Select label="Idioma" value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
          </div>
          <div className={styles.saveRow}>
            {hasChanges && (
              <Button variant="tertiary" size="md" onClick={handleDiscard}>Descartar</Button>
            )}
            <Button variant="primary" size="md" leftIcon={FloppyDisk} disabled={!hasChanges || !firstName.trim() || !lastName.trim() || !email.trim()} onClick={handleSave}>
              Salvar alterações
            </Button>
          </div>
        </div>
      </Card>

      {/* ——— Security ——— */}
      <Card>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Segurança</span>
            <span className={styles.sectionDesc}>Gerencie sua senha e método de autenticação.</span>
          </div>
          <div className={styles.securityItem}>
            <div className={styles.securityText}>
              <span className={styles.securityLabel}>Senha</span>
              <span className={styles.securityDesc}>Altere sua senha de acesso à plataforma.</span>
            </div>
            <Button variant="secondary" size="md" leftIcon={Key} onClick={() => setResetPasswordOpen(true)}>
              Alterar senha
            </Button>
          </div>
          <div className={styles.securityItem}>
            <div className={styles.securityText}>
              <span className={styles.securityLabel}>Método de autenticação</span>
              <span className={styles.securityDesc}>Como você acessa a plataforma.</span>
            </div>
            <span className={styles.securityValue}>{AUTH_PROVIDER_LABEL[user.authProvider] ?? user.authProvider}</span>
          </div>
          <div className={styles.securityItem}>
            <div className={styles.securityText}>
              <span className={styles.securityLabel}>Encerrar sessão</span>
              <span className={styles.securityDesc}>Saia da sua conta neste dispositivo.</span>
            </div>
            <Button variant="danger" size="md" leftIcon={SignOut} onClick={() => toast.success("Sessão encerrada")}>
              Sair
            </Button>
          </div>
        </div>
      </Card>

      {/* ——— Change password modal ——— */}
      <Modal open={resetPasswordOpen} onClose={() => setResetPasswordOpen(false)} size="sm">
        <ModalHeader title="Alterar senha" onClose={() => setResetPasswordOpen(false)} />
        <ModalBody>
          <div className={styles.formStack}>
            <Input label="Senha atual" type="password" value={currentPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)} placeholder="Digite sua senha atual" />
            <Input label="Nova senha" type="password" value={newPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} placeholder="Digite a nova senha" />
            <Input label="Confirmar nova senha" type="password" value={confirmPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="tertiary" size="md" onClick={() => setResetPasswordOpen(false)}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()} onClick={handleChangePassword}>
            Alterar senha
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
