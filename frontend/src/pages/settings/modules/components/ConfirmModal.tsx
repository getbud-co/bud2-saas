import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "@getbud-co/buds";
import styles from "../UsersModule.module.css";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
}

export function ConfirmModal({ open, onClose, title, body, confirmLabel, confirmVariant = "primary", onConfirm }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <p className={styles.confirmText}>{body}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="tertiary" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant={confirmVariant} size="md" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
