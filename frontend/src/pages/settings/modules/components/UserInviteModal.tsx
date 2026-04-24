import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "@getbud-co/buds";
import type { CalendarDate } from "@getbud-co/buds";
import { UserFormFields } from "./UserFormFields";

interface UserInviteModalProps {
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
  onInvite: () => void;
  inviteLoading: boolean;
  canSubmit: boolean;
}

export function UserInviteModal(props: UserInviteModalProps) {
  const {
    open, onClose,
    onInvite, inviteLoading, canSubmit,
    ...formFields
  } = props;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader title="Convidar usuário" onClose={onClose} />
      <ModalBody>
        <UserFormFields {...formFields} />
      </ModalBody>
      <ModalFooter>
        <Button variant="tertiary" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" size="md" disabled={inviteLoading || !canSubmit} onClick={onInvite}>
          {inviteLoading ? "Enviando..." : "Enviar convite"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
