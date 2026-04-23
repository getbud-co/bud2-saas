import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "@getbud-co/buds";
import { CaretDown } from "@phosphor-icons/react";
import type { CalendarDate } from "@getbud-co/buds";
import { UserFormFields } from "./UserFormFields";
import { FilterDropdown } from "@getbud-co/buds";
import styles from "../UsersModule.module.css";

interface UserEditModalProps {
  open: boolean;
  onClose: () => void;
  firstName: string; onFirstNameChange: (v: string) => void;
  lastName: string; onLastNameChange: (v: string) => void;
  nickname: string; onNicknameChange: (v: string) => void;
  email: string; onEmailChange: (v: string) => void;
  jobTitle: string; onJobTitleChange: (v: string) => void;
  teams: string[]; onTeamsChange: (v: string[]) => void;
  teamOptions: { value: string; label: string }[];
  birthDate: CalendarDate | null; onBirthDateChange: (v: CalendarDate | null) => void;
  gender: string; onGenderChange: (v: string) => void;
  language: string; onLanguageChange: (v: string) => void;
  role: string; onRoleChange: (v: string) => void;
  roleOpen: boolean; setRoleOpen: (v: boolean) => void;
  roleBtnRef: React.RefObject<HTMLButtonElement | null>;
  roleLabelBySlug: Map<string, string>;
  roleSelectionOptions: { value: string; label: string; description: string }[];
  onSave: () => void;
  canSubmit: boolean;
}

export function UserEditModal(props: UserEditModalProps) {
  const {
    open, onClose,
    role, onRoleChange, roleOpen, setRoleOpen, roleBtnRef, roleLabelBySlug, roleSelectionOptions,
    onSave, canSubmit,
    ...formFields
  } = props;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader title="Editar perfil" onClose={onClose} />
      <ModalBody>
        <UserFormFields {...formFields} />
        <div className={styles.roleField}>
          <span className={styles.roleLabel}>Tipo de usuário</span>
          <button ref={roleBtnRef} className={styles.roleTrigger} onClick={() => setRoleOpen(!roleOpen)} type="button">
            <span className={styles.roleTriggerText}>{roleLabelBySlug.get(role) ?? "Selecione"}</span>
            <CaretDown size={14} className={styles.roleChevron} />
          </button>
          <FilterDropdown open={roleOpen} onClose={() => setRoleOpen(false)} anchorRef={roleBtnRef}>
            <div className={styles.roleDropdown}>
              {roleSelectionOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.roleOption} ${role === opt.value ? styles.roleOptionActive : ""}`}
                  onClick={() => { onRoleChange(opt.value); setRoleOpen(false); }}
                >
                  <div className={styles.roleOptionText}>
                    <span className={styles.roleOptionLabel}>{opt.label}</span>
                    <span className={styles.roleOptionDesc}>{opt.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </FilterDropdown>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="tertiary" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" size="md" disabled={!canSubmit} onClick={onSave}>
          Salvar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
