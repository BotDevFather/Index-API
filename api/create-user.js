const crypto = require("crypto");

module.exports = async (req, res) => {

  // ======================================
  // ONLY POST
  // ======================================

  if (req.method !== "POST") {

    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });

  }

  try {

    // ======================================
    // BODY
    // ======================================

    const {

      api_key,
      api_secret,

      type,
      duration,
      silent_theme

    } = req.body || {};

    // ======================================
    // VALIDATE
    // ======================================

    if (
      !api_key ||
      !api_secret
    ) {

      return res.status(400).json({

        ok: false,

        error:
          "Missing API credentials"

      });

    }

    // ======================================
    // PAYLOAD
    // ======================================

    const payload = {

      type:
        type || "Root",

      duration:
        Number(duration || 1),

      silent_theme:
        silent_theme || "brutal"

    };

    // ======================================
    // ACTION
    // ======================================

    const action =
      "create_user";

    // ======================================
    // TIMESTAMP
    // ======================================

    const timestamp =
      Math.floor(
        Date.now() / 1000
      ).toString();

    // ======================================
    // NONCE
    // ======================================

    const nonce =
      crypto.randomUUID();

    // ======================================
    // BODY STRING
    // ======================================

    const bodyString =
      JSON.stringify(payload);

    // ======================================
    // BODY HASH
    // ======================================

    const bodyHash =
      crypto
        .createHash("sha256")
        .update(bodyString)
        .digest("hex");

    // ======================================
    // MESSAGE
    // ======================================

    const message =

      timestamp +
      "\n" +

      nonce +
      "\n" +

      action +
      "\n" +

      bodyHash;

    // ======================================
    // SIGNATURE
    // ======================================

    const signature =
      crypto
        .createHmac(
          "sha256",
          api_secret
        )
        .update(message)
        .digest("hex");

    // ======================================
    // REQUEST
    // ======================================

    const response =
      await fetch(

        "https://silentcheats.xyz/api/external/?action=create_user",

        {

          method: "POST",

          headers: {

            Authorization:
              "Bearer " + api_key,

            "Content-Type":
              "application/json",

            "X-Timestamp":
              timestamp,

            "X-Nonce":
              nonce,

            "X-Signature":
              signature

          },

          body:
            bodyString

        }

      );

    // ======================================
    // RESPONSE
    // ======================================

    const data =
      await response.json();

    // ======================================
    // RETURN
    // ======================================

    return res.status(200).json(data);

  } catch (e) {

    return res.status(500).json({

      ok: false,

      error:
        e.message

    });

  }

};
