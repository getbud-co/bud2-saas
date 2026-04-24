import { Input, Select, DatePicker } from "@getbud-co/buds";
import { Envelope } from "@phosphor-icons/react";
import type { CalendarDate } from "@getbud-co/buds";
import styles from "../UsersModule.module.css";

const LANGUAGE_OPTIONS = [
  { value: "pt-br", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao-binario", label: "Não-binário" },
  { value: "prefiro-nao-dizer", label: "Prefiro não dizer" },
];

interface UserFormFieldsProps {
  firstName: string;
  onFirstNameChange: (v: string) => void;
  lastName: string;
  onLastNameChange: (v: string) => void;
  nickname: string;
  onNicknameChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  jobTitle: string;
  onJobTitleChange: (v: string) => void;
  teams: string[];
  onTeamsChange: (v: string[]) => void;
  teamOptions: { value: string; label: string }[];
  birthDate: CalendarDate | null;
  onBirthDateChange: (v: CalendarDate | null) => void;
  gender: string;
  onGenderChange: (v: string) => void;
  language: string;
  onLanguageChange: (v: string) => void;
  role: string;
  onRoleChange: (v: string) => void;
  roleOptions: { value: string; label: string }[];
}

export function UserFormFields({
  firstName, onFirstNameChange,
  lastName, onLastNameChange,
  nickname, onNicknameChange,
  email, onEmailChange,
  jobTitle, onJobTitleChange,
  teams, onTeamsChange, teamOptions,
  birthDate, onBirthDateChange,
  gender, onGenderChange,
  language, onLanguageChange,
  role, onRoleChange, roleOptions,
}: UserFormFieldsProps) {
  return (
    <div className={styles.formStack}>
      <div className={styles.formRow}>
        <Input label="Nome" value={firstName} onChange={(e) => onFirstNameChange(e.target.value)} placeholder="Nome" />
        <Input label="Sobrenome" value={lastName} onChange={(e) => onLastNameChange(e.target.value)} placeholder="Sobrenome" />
      </div>
      <div className={styles.formRow}>
        <Input label="Apelido" value={nickname} onChange={(e) => onNicknameChange(e.target.value)} placeholder="Como prefere ser chamado" />
        <Input label="E-mail" value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="email@empresa.com" leftIcon={Envelope} />
      </div>
      <div className={styles.formRow}>
        <Input label="Cargo" value={jobTitle} onChange={(e) => onJobTitleChange(e.target.value)} placeholder="Ex: Product Manager" />
        <Select label="Time" value={teams} onChange={onTeamsChange} options={teamOptions} multiple />
      </div>
      <div className={styles.formRow}>
        <div className={styles.dateField}>
          <span className={styles.roleLabel}>Data de nascimento</span>
          <DatePicker mode="single" value={birthDate} onChange={onBirthDateChange} />
        </div>
        <Select label="Gênero" value={gender} onChange={onGenderChange} options={GENDER_OPTIONS} />
      </div>
      <div className={styles.formRow}>
        <Select label="Idioma" value={language} onChange={onLanguageChange} options={LANGUAGE_OPTIONS} />
        <Select label="Tipo de usuário" value={role} onChange={onRoleChange} options={roleOptions} />
      </div>
    </div>
  );
}
