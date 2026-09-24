"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { registerSchema } from "@/lib/validations";
import { api, errorMessage, useToast } from "@/components/providers";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui";
import { Field, Input } from "@/components/ui";

type RegisterValues = { name: string; email: string; password: string };

export default function RegisterPage() {
  const router = useRouter();
  const { error: toastError, success } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterValues) {
    try {
      await api.post("/api/auth/register", {
        ...values,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      success("Tạo tài khoản thành công", "Bắt đầu bằng việc thêm sản phẩm đầu tiên.");
      router.push("/products?new=1");
      router.refresh();
    } catch (err) {
      toastError("Đăng ký thất bại", errorMessage(err));
    }
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Miễn phí. Không cần thẻ. Tài khoản đầu tiên trong hệ thống có quyền quản trị AI Settings."
      footer={
        <span>
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Đăng nhập
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Tên của bạn" required error={errors.name?.message}>
          <Input
            autoComplete="name"
            placeholder="Ví dụ: Linh Nguyễn"
            invalid={Boolean(errors.name)}
            {...register("name")}
          />
        </Field>

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
          hint="Tối thiểu 8 ký tự, gồm chữ và số."
        >
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
          Tạo tài khoản
        </Button>

        <p className="text-center text-xs text-slate-500">
          Bằng việc đăng ký, bạn đồng ý tự chịu trách nhiệm về nội dung mình đăng tải.
        </p>
      </form>
    </AuthLayout>
  );
}
