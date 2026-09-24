"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/validations";
import { api, errorMessage, useToast } from "@/components/providers";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui";
import { Field, Input } from "@/components/ui";

type Values = { email: string };

export default function ForgotPasswordPage() {
  const { error: toastError, success } = useToast();
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  async function onSubmit(values: Values) {
    try {
      const res = await api.post<{ resetUrl?: string }>("/api/auth/forgot-password", values);
      setResetUrl(res.resetUrl ?? null);
      success("Đã xử lý yêu cầu", "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được tạo.");
    } catch (err) {
      toastError("Gửi yêu cầu thất bại", errorMessage(err));
    }
  }

  return (
    <AuthLayout
      title="Quên mật khẩu"
      subtitle="Nhập email đăng ký. Liên kết đặt lại có hiệu lực 30 phút."
      footer={
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          ← Quay lại đăng nhập
        </Link>
      }
    >
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
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Gửi liên kết đặt lại
        </Button>
      </form>

      {resetUrl ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-900">
          <p className="font-medium">Chưa cấu hình dịch vụ email trong môi trường này.</p>
          <p className="mt-1 text-amber-800">
            Dùng liên kết dưới đây để đặt lại mật khẩu (token cũng được ghi trong log máy chủ):
          </p>
          <Link href={resetUrl} className="mt-2 block font-medium break-all text-brand-700 underline">
            {resetUrl}
          </Link>
        </div>
      ) : null}
    </AuthLayout>
  );
}
