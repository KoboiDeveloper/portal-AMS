import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Head from "../../layout/head/Head";
import { Icon } from "../../components/Component";
import { Spinner } from "reactstrap";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { appPath } from "../../lib/paths";
import AmsLogo from "../../images/logo2x.png";
import "./rbac-login.css";

const RbacLogin = () => {
  const { login, loading, purgeSession } = useAuth();
  const navigate = useNavigate();
  const [passState, setPassState] = useState(false);
  const [errorVal, setError] = useState("");
  const [successVal, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { username: "admin", password: "Admin@123" },
  });

  useEffect(() => {
    purgeSession();
  }, [purgeSession]);

  const onFormSubmit = async (formData) => {
    setError("");
    setSuccess("");
    try {
      const { homePath: nextHome } = await login(formData.username, formData.password);
      setSuccess("Berhasil masuk. Mengalihkan…");
      window.setTimeout(() => {
        navigate(appPath(nextHome || "/dashboard"), { replace: true });
      }, 700);
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Login failed");
    }
  };

  return (
    <>
      <Head title="Login" />
      <div className="ams-login">
        <div className="ams-login__bg" aria-hidden="true" />
        <svg className="ams-login__lines" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className="ams-login__line ams-login__line--a" d="M-40 180 C 220 40, 420 320, 680 210 S 1100 40, 1500 160" />
            <path className="ams-login__line ams-login__line--b" d="M-60 420 C 180 520, 360 280, 620 390 S 980 560, 1480 360" />
            <path className="ams-login__line ams-login__line--c" d="M-20 700 C 260 580, 480 780, 760 660 S 1120 500, 1500 720" />
            <path className="ams-login__line ams-login__line--d" d="M200 -20 C 260 160, 180 340, 340 520 S 520 760, 480 940" />
            <path className="ams-login__line ams-login__line--e" d="M1180 -40 C 1080 180, 1280 320, 1120 520 S 1240 760, 1160 960" />
            <path className="ams-login__line ams-login__line--f" d="M40 860 C 280 780, 520 900, 760 820 S 1100 700, 1400 860" />
            <path className="ams-login__line ams-login__line--g" d="M900 40 C 820 200, 980 280, 860 440 S 1000 620, 920 820" />
          </g>
        </svg>

        <div className="ams-login__shell">
          <div className="ams-login__mark">
            <img src={AmsLogo} alt="Ams group portal" width={120} height={48} />
          </div>

          <h1 className="ams-login__title">Ams group portal</h1>
          <p className="ams-login__sub">Welcome to AMS Group by PT Aditya Mandiri Sejahtera.</p>

          {errorVal ? (
            <div className="ams-login__alert" role="alert">
              <Icon name="alert-circle" />
              <span>{errorVal}</span>
            </div>
          ) : null}

          <form className="ams-login__form" onSubmit={handleSubmit(onFormSubmit)} noValidate>
            <div className="ams-login__field">
              <label className="ams-login__label" htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                autoComplete="username"
                className={`ams-login__input${errors.username ? " is-invalid" : ""}`}
                placeholder="Username"
                disabled={Boolean(successVal)}
                {...register("username", { required: "Username required" })}
              />
              {errors.username ? <span className="ams-login__error">{errors.username.message}</span> : null}
            </div>

            <div className="ams-login__field">
              <label className="ams-login__label" htmlFor="password">
                Password
              </label>
              <div className="ams-login__pass-wrap">
                <input
                  type={passState ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  className={`ams-login__input ams-login__input--pass${errors.password ? " is-invalid" : ""}`}
                  placeholder="Password"
                  disabled={Boolean(successVal)}
                  {...register("password", { required: "Password required" })}
                />
                <button
                  type="button"
                  className="ams-login__eye"
                  aria-label={passState ? "Hide password" : "Show password"}
                  onClick={() => setPassState((v) => !v)}
                >
                  <Icon name={passState ? "eye-off" : "eye"} />
                </button>
              </div>
              {errors.password ? <span className="ams-login__error">{errors.password.message}</span> : null}
            </div>

            {successVal ? (
              <div className="ams-login__success" role="status">
                <Icon name="check-circle" />
                <span>{successVal}</span>
              </div>
            ) : null}

            <button type="submit" className="ams-login__btn" disabled={loading || Boolean(successVal)}>
              {loading ? <Spinner size="sm" color="light" /> : successVal ? "Masuk…" : "Login"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default RbacLogin;
