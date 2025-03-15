console.log("Verificación de endpoint de email");

const axios = require("axios");

async function verificarEndpoints() {

  try {

    console.log("Probando endpoint 1: /api/v1/admin/settings/email");

    const res1 = await axios.get("http://localhost:8000/api/v1/admin/settings/email");

    console.log("Respuesta:", res1.status, res1.statusText);

    
    console.log("\nProbando endpoint 2: /api/v1/email/config");

    const res2 = await axios.get("http://localhost:8000/api/v1/email/config");

    console.log("Respuesta:", res2.status, res2.statusText);

  } catch (error) {

    console.error("Error:", error.message);

    if (error.response) {

      console.error("Detalles:", error.response.status, error.response.statusText);

    }

  }

}

verificarEndpoints();
