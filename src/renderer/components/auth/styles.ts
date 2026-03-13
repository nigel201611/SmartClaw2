/**
 * SmartClaw Auth Components Styles
 * 
 * 认证界面组件样式
 */

export const authStyles = `
/* ========== Auth Screen ========== */
.auth-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.auth-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.gradient-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: 400% 400%;
  animation: gradient 15s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.auth-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  padding: 2rem;
}

.auth-footer {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
  margin-top: 2rem;
}

.auth-footer p {
  margin: 0.25rem 0;
  opacity: 0.9;
}

.auth-footer .hint {
  font-size: 0.875rem;
  opacity: 0.7;
}

/* ========== Auth Dialog ========== */
.auth-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.auth-dialog {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  animation: dialog-slide-in 0.3s ease-out;
}

@keyframes dialog-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.auth-dialog-header {
  padding: 2rem 2rem 1rem;
  text-align: center;
}

.auth-dialog-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem;
}

.auth-dialog-header p {
  color: #64748b;
  margin: 0;
  font-size: 0.9375rem;
}

.auth-form {
  padding: 1rem 2rem 2rem;
}

/* ========== Form Elements ========== */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="url"] {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.form-hint {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}

/* Password Input */
.password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input input {
  padding-right: 3rem;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.password-toggle:hover {
  opacity: 1;
}

/* Checkbox */
.checkbox-group {
  display: flex;
  flex-direction: column;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 400;
}

.checkbox-label input[type="checkbox"] {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
}

/* Form Error */
.form-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

/* Form Actions */
.form-actions {
  margin-top: 2rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-block {
  width: 100%;
}

.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 0.875rem;
  text-decoration: underline;
  padding: 0;
}

.btn-link:hover {
  color: #2563eb;
}

/* Spinner */
.spinner-small {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dialog Footer */
.auth-dialog-footer {
  padding: 1.5rem 2rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  border-radius: 0 0 16px 16px;
  text-align: center;
}

.auth-dialog-footer p {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.auth-dialog-footer p:first-child {
  margin-top: 0;
}

.auth-dialog-footer .link {
  color: #3b82f6;
  text-decoration: none;
}

.auth-dialog-footer .link:hover {
  text-decoration: underline;
}

.auth-dialog-footer .hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* ========== Responsive ========== */
@media (max-width: 480px) {
  .auth-content {
    padding: 1rem;
  }

  .auth-dialog {
    max-height: 100vh;
    border-radius: 0;
  }

  .auth-dialog-header {
    padding: 1.5rem 1.5rem 1rem;
  }

  .auth-form {
    padding: 1rem 1.5rem 1.5rem;
  }

  .auth-dialog-footer {
    padding: 1.5rem;
  }
}
`;

export default authStyles;
