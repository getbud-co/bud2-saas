import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import { UserFormFields } from "./UserFormFields";

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
  roleOptions: { value: string; label: string }[];
  onSave: () => void;
  canSubmit: boolean;
}

export function UserEditModal(props: UserEditModalProps) {
  const {
    open, onClose,
    onSave, canSubmit,
    ...formFields
  } = props;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader title="Editar perfil" onClose={onClose} />
      <ModalBody>
        <UserFormFields {...formFields} />
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
