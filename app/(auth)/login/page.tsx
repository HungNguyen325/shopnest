"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema } from "@/lib/validations";
import { api, errorMessage, useToast } from "@/components/providers";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui";
import { Field, Input } from "@/components/ui";

type LoginValues = { email: string; password: string };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { error: toastError, info } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const next = params.get("next") || "/dashboard";
  const expired = params.get("expired") === "1";
  const demoEmail = params.get("demo") === "1";

  // Already signed in (valid DB session)? Go straight to the app.
  // Client-side on purpose: a server redirect based on cookie presence alone
  // would loop when the cookie is stale but the DB session is gone.
  useEffect(() => {
    api
      .get("/api/account")
      .then(() => router.replace(next))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: demoEmail ? "demo@contentflow.ai" : "", password: demoEmail ? "demo1234" : "" },
  });

  async function onSubmit(values: LoginValues) {
    try {
      await api.post("/api/auth/login", values);
      router.push(next);
      router.refresh();
    } catch (err) {
      toastError("Đăng nhập thất bại", errorMessage(err));
    }
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Tiếp tục quản lý sản phẩm và lịch nội dung của bạn."
      footer={
        <span>
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
            Đăng ký miễn phí
          </Link>
        </span>
      }
    >
      {expired ? (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800"
        >
          Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email" required error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="ban@vidu.com"
            invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </Field>

        <Field
          label="Mật khẩu"
          required
          error={errors.password?.message}
          hint={
            <Link href="/forgot-password" className="text-brand-600 hover:text-brand-700">
              Quên mật khẩu?
            </Link>
          }
        >
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Đăng nhập
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3.5">
        <p className="text-[13px] font-medium text-slate-700">Tài khoản demo (dữ liệu mẫu)</p>
        <p className="mt-1 text-xs text-slate-500">demo@contentflow.ai · demo1234</p>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              router.push("/login?demo=1");
              info("Đã điền sẵn thông tin demo", "Bấm Đăng nhập để vào.");
            }}
          >
            Điền thông tin demo
          </Button>
          <Link
            href="/register"
            className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Tạo tài khoản mới
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
