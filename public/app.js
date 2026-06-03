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


async function verifyToken() {
  const token =
    document.getElementById(
      "token"
    ).value;
  const result = document.getElementById("result");

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

  const data =
    await response.json();

  if (data.valid) {
      result.classList.add("success");
      result.innerHTML = "🎉 Login berhasil! <br> Username: ${data.username}";
  } else {
    document.getElementById(
      "result"
    ).textContent =
      "Token tidak valid.";
  }
}