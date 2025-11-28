let toastActive = false;
let toastTimeout;

export function showToast(message) {
  const toast = document.getElementById('toast');

  if (toastActive) {
    toast.textContent = message;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
      toastActive = false;
    }, 2000);
    return;
  }

  toastActive = true;
  toast.textContent = message;
  toast.classList.add('show');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    toastActive = false;
  }, 2000);
}