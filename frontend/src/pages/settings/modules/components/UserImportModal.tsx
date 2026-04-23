import { useRef } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "@getbud-co/buds";
import { UploadSimple, FileText, DownloadSimple } from "@phosphor-icons/react";
import styles from "../UsersModule.module.css";

interface UserImportModalProps {
  open: boolean;
  onClose: () => void;
  importFile: File | null;
  onFileChange: (file: File | null) => void;
  onDownloadTemplate: () => void;
  onImport: () => void;
}

export function UserImportModal({ open, onClose, importFile, onFileChange, onDownloadTemplate, onImport }: UserImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader title="Importar usuários" onClose={onClose} />
      <ModalBody>
        <div className={styles.formStack}>
          <p className={styles.importDesc}>
            Faça o upload de uma planilha com os dados dos usuários para cadastrá-los em massa na plataforma.
          </p>
          <button type="button" className={styles.templateLink} onClick={onDownloadTemplate}>
            <FileText size={20} />
            <div className={styles.templateLinkText}>
              <span className={styles.templateLinkTitle}>Baixar template</span>
              <span className={styles.templateLinkDesc}>Template CSV com os campos e valores aceitos</span>
            </div>
            <DownloadSimple size={16} />
          </button>
          <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx,.csv"
              className={styles.fileInput}
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            <UploadSimple size={24} />
            {importFile ? (
              <span className={styles.uploadFileName}>{importFile.name}</span>
            ) : (
              <>
                <span className={styles.uploadText}>Arraste ou clique para selecionar</span>
                <span className={styles.uploadHint}>.xls, .xlsx ou .csv</span>
              </>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="tertiary" size="md" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" size="md" disabled={!importFile} onClick={onImport}>
          Importar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
