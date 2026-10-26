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
    defaultValues: { username: "", password: "" },
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

  const year = new Date().getFullYear();

  return (
    <>
      <Head title="Login" />
      <div className="ams-login">
        <aside className="ams-login__brand" aria-label="AMS Group">
          <div className="ams-login__brand-top">
            <span className="ams-login__mark">Portal</span>
          </div>
          <div className="ams-login__brand-mid">
            <h1 className="ams-login__name">
              AMS
              <br />
              Group
            </h1>
            <hr className="ams-login__rule" />
            <p className="ams-login__tagline">
              Portal operasional untuk retail, regional, dan marketplace.
            </p>
          </div>
          <p className="ams-login__brand-foot">Internal use only</p>
        </aside>

        <main className="ams-login__panel">
          <div className="ams-login__panel-inner">
            <h2 className="ams-login__heading">Masuk</h2>
            <p className="ams-login__sub">Gunakan akun RBAC AMS Anda.</p>

            {errorVal ? (
              <div className="ams-login__alert" role="alert">
                <Icon name="alert-circle" />
                <span>{errorVal}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
              <div className="ams-login__field">
                <label className="ams-login__label" htmlFor="username">
                  Username
                </label>
                <div className="ams-login__control">
                  <input
                    type="text"
                    id="username"
                    autoComplete="username"
                    placeholder="Masukkan username"
                    className={`ams-login__input${errors.username ? " is-invalid" : ""}`}
                    {...register("username", { required: "Username wajib diisi" })}
                  />
                </div>
                {errors.username ? (
                  <span className="ams-login__error">{errors.username.message}</span>
                ) : null}
              </div>

              <div className="ams-login__field">
                <label className="ams-login__label" htmlFor="password">
                  Password
                </label>
                <div className="ams-login__control">
                  <input
                    type={passState ? "text" : "password"}
                    id="password"
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    className={`ams-login__input ams-login__input--pass${
                      errors.password ? " is-invalid" : ""
                    }`}
                    {...register("password", { required: "Password wajib diisi" })}
                  />
                  <button
                    type="button"
                    className="ams-login__eye"
                    aria-label={passState ? "Sembunyikan password" : "Tampilkan password"}
                    onClick={() => setPassState((v) => !v)}
                  >
                    <Icon name={passState ? "eye-off" : "eye"} />
                  </button>
                </div>
                {errors.password ? (
                  <span className="ams-login__error">{errors.password.message}</span>
                ) : null}
              </div>

              <button type="submit" className="ams-login__submit" disabled={loading}>
                {loading ? <Spinner size="sm" color="light" /> : "Masuk"}
              </button>
            </form>

            <footer className="ams-login__footer">
              &copy; {year} AMS Group. All rights reserved.
            </footer>
          </div>
        </main>
      </div>
    </>
  );
};

export default RbacLogin;
