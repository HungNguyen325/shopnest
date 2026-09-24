"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resetPasswordSchema } from "@/lib/validations";

const passwordRule = resetPasswordSchema.shape.password;
const formSchema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirm"],
  });
import { api, errorMessage, useToast } from "@/components/providers";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui";
import { Field, Input } from "@/components/ui";

type Values = { password: string; confirm: string };

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { error: toastError, success } = useToast();
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(formSchema), defaultValues: { password: "", confirm: "" } });

  async function onSubmit(values: Values) {
    if (values.password !== values.confirm) {
      toastError("Mật khẩu không khớp", "Hãy nhập lại giống nhau ở cả hai ô.");
      return;
    }
    try {
      await api.post("/api/auth/reset-password", { token, password: values.password });
      success("Đặt lại mật khẩu thành công", "Hãy đăng nhập lại.");
      router.push("/login");
    } catch (err) {
      toastError("Đặt lại thất bại", errorMessage(err));
    }
  }

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      subtitle="Chọn mật khẩu mới. Các phiên đăng nhập cũ sẽ bị đăng xuất."
      footer={
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      {!token ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800">
          Thiếu token đặt lại mật khẩu. Hãy yêu cầu lại từ trang Quên mật khẩu.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Mật khẩu mới" required error={errors.password?.message} hint="Tối thiểu 8 ký tự, gồm chữ và số.">
            <Input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              invalid={Boolean(errors.password)}
              {...register("password")}
            />
          </Field>
          <Field label="Nhập lại mật khẩu" required error={errors.confirm?.message}>
            <Input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              invalid={Boolean(errors.confirm)}
              {...register("confirm")}
            />
          </Field>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-[13px] font-medium text-slate-600 hover:text-slate-900"
          >
            {show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          </button>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Đặt lại mật khẩu
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
