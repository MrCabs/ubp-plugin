import React from 'react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterActions,
  ModalHeader,
  ModalHeading
} from '@twilio-paste/core/modal';
import { Button } from '@twilio-paste/core/button';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  content: string;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation',
  content
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onClose}
      ariaLabelledby="custom-modal-heading"
      size="default"
    >
      <ModalHeader>
        <ModalHeading as="h3" id="custom-modal-heading">
          {title}
        </ModalHeading>
      </ModalHeader>
      <ModalBody>{content}</ModalBody>
      <ModalFooter>
        <ModalFooterActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Confirm
          </Button>
        </ModalFooterActions>
      </ModalFooter>
    </Modal>
  );
};