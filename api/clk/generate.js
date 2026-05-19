// api/clk/generate.js

const crypto = require("crypto");
const axios = require("axios");

module.exports = async (req, res) => {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }

  try {

    const {
      keyId,
      secret,
      duration_id,
      quantity
    } = req.body;

    const bodyObj = {

      duration_id:
        Number(duration_id),

      quantity:
        Number(quantity || 1)

    };

    const body =
      JSON.stringify(bodyObj);

    const ts =
      Math.floor(
        Date.now() / 1000
      ).toString();

    const nonce =
      crypto
        .randomBytes(16)
        .toString("hex");

    const path =
      "/api/v1/reseller/x/generate.php";

    const bodyHash =
      crypto
        .createHash("sha256")
        .update(body)
        .digest("hex");

    const signMessage =

      "POST\n" +
      path + "\n" +
      ts + "\n" +
      nonce + "\n" +
      bodyHash;

    const signature =
      crypto
        .createHmac(
          "sha256",
          Buffer.from(
            secret,
            "hex"
          )
        )
        .update(signMessage)
        .digest("hex");

    const response =
      await axios.post(

        "https://chotulink.online" +
        path,

        bodyObj,

        {

          headers: {

            "Content-Type":
              "application/json",

            "X-Api-Key":
              keyId,

            "X-Api-Timestamp":
              ts,

            "X-Api-Nonce":
              nonce,

            "X-Api-Signature":
              signature

          }

        }

      );

    return res.json({

      success: true,

      debug: {

        timestamp:
          ts,

        nonce:
          nonce,

        bodyHash:
          bodyHash,

        signature:
          signature

      },

      response:
        response.data

    });

  } catch (e) {

    return res.status(
      e.response?.status || 500
    ).json({

      success: false,

      error:
        e.message,

      response:
        e.response?.data || null

    });

  }

};
