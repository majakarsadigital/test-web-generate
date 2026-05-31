async function generateToken() {

  const username =
    document.getElementById("username").value;

  const response = await fetch(
    "/api/generate",
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        username
      })
    }
  );

  const data = await response.json();

  document.getElementById(
    "result"
  ).textContent =
    JSON.stringify(data,null,2);
}