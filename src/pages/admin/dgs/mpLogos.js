import blibli from "../../../images/marketplace/blibli.png";
import lazada from "../../../images/marketplace/lazada.jpg";
import shopee from "../../../images/marketplace/shopee.png";
import tiktok from "../../../images/marketplace/tiktok.png";
import tokopedia from "../../../images/marketplace/tokopedia.png";
import zilingo from "../../../images/marketplace/zilingo.png";

/** Logo marketplace (disalin dari images/market_image di aplikasi ASP). */
export const MP_LOGOS = {
  BLIBLI: blibli,
  LAZADA: lazada,
  SHOPEE: shopee,
  ZILINGO: zilingo,
  TOKOPEDIA: tokopedia,
  TIKTOK: tiktok,
};

export const mpLogo = (name) => MP_LOGOS[String(name || "").trim().toUpperCase()] || null;
