import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Head from "../../layout/head/Head";
import { Icon } from "../../components/Component";
import { Spinner } from "reactstrap";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { appPath } from "../../lib/paths";
import { toast } from "react-toastify";
import "./rbac-login.css";

const RbacLogin = () => {
  const { login, loading, purgeSession } = useAuth();
  const navigate = useNavigate();
  const [passState, setPassState] = useState(false);
  const [errorVal, setError] = useState("");

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
    try {
      const { homePath: nextHome } = await login(formData.username, formData.password);
      toast.success("Login successful");
      navigate(appPath(nextHome || "/dashboard"), { replace: true });
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Login failed");
    }
  };

  return (
    <>
      <Head title="Login" />
      <div className="ams-login">
        <div className="ams-login__bg" aria-hidden="true" />
        <div className="ams-login__particles" aria-hidden="true">
          <span /><span /><span /><span /><span />
          <span /><span /><span /><span /><span />
          <span /><span /><span /><span /><span />
          <span /><span /><span /><span /><span />
        </div>

        <div className="ams-login__shell">
          <div className="ams-login__mark" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="8" width="24" height="20" rx="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="M6 14h24M14 14v14M22 14v14" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <h1 className="ams-login__title">AMS Group</h1>
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

            <button type="submit" className="ams-login__btn" disabled={loading}>
              {loading ? <Spinner size="sm" color="light" /> : "Login"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default RbacLogin;
