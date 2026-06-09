async function generateToken() {

  const username =
    document.getElementById(
      "username"
    ).value;

  const response =
    await fetch(
      "/api/generate",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          username
        })
      }
    );

  const data =
    await response.json();

  document.getElementById(
    "result"
  ).textContent =
    JSON.stringify(
      data,
      null,
      2
    );
}

const overlay  = document.getElementById('auth-overlay');
const dialog   = document.getElementById('login-dialog');
const content  = document.getElementById('main-content');
const errMsg   = document.getElementById('error-msg');
const input    = document.getElementById('token');
const btn      = document.getElementById('login-btn');
const tokenVal = input.value.trim();


function closeDialog() {
  dialog.classList.add('closing');
  dialog.addEventListener('animationend', () => {
    overlay.classList.add('hidden');
    content.classList.add('unlocked');
  }, { once: true });
}

function setError(msg) {
  errMsg.textContent      = '⚠️ ' + msg;
  errMsg.style.display    = 'block';
  input.style.borderColor = '#E24B4A';
  input.style.boxShadow   = '3px 3px 0 #E24B4A';
}

function resetError() {
  errMsg.style.display    = 'none';
  input.style.borderColor = '#1a1a1a';
  input.style.boxShadow   = '3px 3px 0 #1a1a1a';
}

async function verifyToken() {

  if (!tokenVal) {
    setError('Token tidak boleh kosong!');
    return;
  }

  resetError();
  btn.textContent = '⏳ Memverifikasi...';
  btn.disabled    = true;

  try{
    const response =
      await fetch(
        "/api/verify",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            token,
          }),
        }
      );
    const data = await response.json();
    if (response.ok && data.success) {
      btn.textContent      = '✅ Berhasil! Membuka...';
      btn.style.background = '#0F6E56';
      btn.style.color      = '#E1F5EE';
      btn.style.boxShadow  = '4px 4px 0 #085041';

      setTimeout(() => closeDialog(), 800);
    } else {
      throw new Error(data.message || 'Token tidak valid');
    }
  } catch (err) {
    errMsg.textContent     = '⚠️ ' + err.message;
    errMsg.style.display   = 'block';
    btn.textContent        = '🚀 Login';
    btn.disabled           = false;
  }
}