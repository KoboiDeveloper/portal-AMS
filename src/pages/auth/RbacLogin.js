import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../../images/logo.png";
import LogoDark from "../../images/logo-dark.png";
import Head from "../../layout/head/Head";
import AuthFooter from "../auth/AuthFooter";
import { Block, BlockContent, BlockDes, BlockHead, BlockTitle, Button, Icon, PreviewCard } from "../../components/Component";
import { Form, Spinner, Alert } from "reactstrap";
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
      <Block className="nk-block-middle nk-auth-body wide-xs ams-login-page">
        <div className="brand-logo pb-3 text-center">
          <Link to={appPath("/login")} className="logo-link">
            <img className="logo-light logo-img logo-img-lg" src={Logo} alt="AMS Group" />
            <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="AMS Group" />
          </Link>
          <div className="ams-login-brand">AMS Group</div>
        </div>

        <PreviewCard className="card-bordered ams-login-card" bodyClass="card-inner-lg">
          <BlockHead>
            <BlockContent>
              <BlockTitle tag="h4">Sign-In</BlockTitle>
              <BlockDes>
                <p>Masuk dengan akun AMS RBAC Anda.</p>
              </BlockDes>
            </BlockContent>
          </BlockHead>

          {errorVal && (
            <div className="mb-3">
              <Alert color="danger" className="alert-icon">
                <Icon name="alert-circle" /> {errorVal}
              </Alert>
            </div>
          )}

          <Form className="is-alter" onSubmit={handleSubmit(onFormSubmit)}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                autoComplete="username"
                {...register("username", { required: "Username required" })}
                className="form-control-lg form-control"
                placeholder="Username"
              />
              {errors.username && <span className="invalid">{errors.username.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="form-control-wrap">
                <input
                  type={passState ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  {...register("password", { required: "Password required" })}
                  className="form-control-lg form-control"
                  placeholder="Password"
                />
                <a
                  href="#password"
                  className="form-icon lg form-icon-right passcode-switch"
                  onClick={(e) => {
                    e.preventDefault();
                    setPassState(!passState);
                  }}
                >
                  <Icon name={passState ? "eye-off" : "eye"} />
                </a>
              </div>
              {errors.password && <span className="invalid">{errors.password.message}</span>}
            </div>
            <div className="form-group">
              <Button size="lg" className="btn-block" type="submit" color="primary" disabled={loading}>
                {loading ? <Spinner size="sm" color="light" /> : "Sign in"}
              </Button>
            </div>
          </Form>
        </PreviewCard>
      </Block>
      <AuthFooter />
    </>
  );
};

export default RbacLogin;
