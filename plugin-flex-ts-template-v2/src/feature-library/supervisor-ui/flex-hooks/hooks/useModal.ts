import { useState, useEffect } from 'react';

export const useModal = (
  toggleShutdown: boolean,
  shutdown: boolean,
  setToggleShutdown: (value: boolean) => void,
  handleShutdownChange: (value: boolean) => void,
) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (toggleShutdown && !shutdown) {
      setShowModal(true);
    }
  }, [toggleShutdown, shutdown]);

  const handleModalConfirm = () => {
    setShowModal(false);
    setToggleShutdown(true);
    handleShutdownChange(true);
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setToggleShutdown(false);
  };

  return {
    showModal,
    handleModalConfirm,
    handleModalCancel,
  };
};
