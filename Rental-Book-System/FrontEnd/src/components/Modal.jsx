import React, { useState } from "react";
import Modal from "../components/Modal";

const Settings = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteAccount = (password) => {
    // handle account deletion logic here
  };

  return (
    <div>
      {/* Other settings content */}

      <button
        className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
        onClick={() => setShowDeleteModal(true)}
      >
        Delete Account
      </button>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <h2 className="text-xl font-bold text-red-700 mb-3">Confirm Deletion</h2>
        <p className="text-gray-700 mb-4">
          This action is permanent. Please type your password to confirm.
        </p>

        <input
          type="password"
          id="modal-delete-password"
          className="w-full p-3 border rounded-md mb-4"
          placeholder="Enter your password"
        />

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              const pw = document.getElementById("modal-delete-password").value;
              if (!pw) {
                alert("Please enter your password.");
                return;
              }
              if (typeof handleDeleteAccount === "function") {
                handleDeleteAccount(pw);
              }
            }}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
