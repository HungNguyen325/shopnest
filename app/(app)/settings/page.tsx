"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, KeyRound, ShieldCheck, Sparkles, User as UserIcon } from "lucide-react";
import { api, errorMessage, useToast } from "@/components/providers";
import { Badge, Card, CardBody, CardHeader, SkeletonRows } from "@/components/ui";
import { Button } from "@/components/ui";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { PLATFORMS, TONES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

interface AccountData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    timezone: string;
    createdAt: string;
  };
  brand: {
    brandName: string | null;
    industry: string | null;
    targetAudience: string | null;
    defaultTone: string;
    defaultPlatform: string;
    defaultLanguage: string;
    preferredHashtags: string;
    bannedWords: string;
    brandRules: string | null;
    preferredCTA: string | null;
    personalStory: string | null;
    dataConsent: boolean;
    updatedAt: string;
  } | null;
  sessions: { id: string; createdAt: string; userAgent: string | null }[];
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["account"],
    queryFn: () => api.get<AccountData>("/api/account"),
  });

  const [profile, setProfile] = useState({ name: "", timezone: "" });
  const [brand, setBrand] = useState({
    brandName: "",
    industry: "",
    targetAudience: "",
    defaultTone: "natural",
    defaultPlatform: "tiktok",
    defaultLanguage: "vi",
    preferredHashtags: "",
    bannedWords: "",
    brandRules: "",
    preferredCTA: "",
    personalStory: "",
    dataConsent: false,
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Sync local form state from the server payload during render.
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  const dataKey = data ? `${data.user.name}|${data.user.timezone}|${data.brand?.updatedAt ?? ""}|${data.brand?.brandName ?? ""}` : null;
  if (data && dataKey !== syncedKey) {
    setSyncedKey(dataKey);
    setProfile({ name: data.user.name, timezone: data.user.timezone });
    if (data.brand) {
      setBrand({
        brandName: data.brand.brandName ?? "",
        industry: data.brand.industry ?? "",
        targetAudience: data.brand.targetAudience ?? "",
        defaultTone: data.brand.defaultTone ?? "natural",
        defaultPlatform: data.brand.defaultPlatform ?? "tiktok",
        defaultLanguage: data.brand.defaultLanguage ?? "vi",
        preferredHashtags: data.brand.preferredHashtags ?? "",
        bannedWords: data.brand.bannedWords ?? "",
        brandRules: data.brand.brandRules ?? "",
        preferredCTA: data.brand.preferredCTA ?? "",
        personalStory: data.brand.personalStory ?? "",
        dataConsent: data.brand.dataConsent ?? false,
      });
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api.patch("/api/account", profile);
      success("Đã cập nhật thông tin");
      refetch();
    } catch (err) {
      toastError("Cập nhật thất bại", errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveBrand() {
    setSavingBrand(true);
    try {
      await api.put("/api/account/brand-profile", brand);
      success("Đã lưu hồ sơ thương hiệu", "AI sẽ dùng thông tin này cho các bài tạo sau.");
    } catch (err) {
      toastError("Lưu thất bại", errorMessage(err));
    } finally {
      setSavingBrand(false);
    }
  }

  async function changePassword() {
    if (passwords.newPassword.length < 8) {
      toastError("Mật khẩu quá ngắn", "Tối thiểu 8 ký tự, gồm chữ và số.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/api/account/change-password", passwords);
      success("Đã đổi mật khẩu");
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toastError("Đổi mật khẩu thất bại", errorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <SkeletonRows rows={6} />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header className="lg:hidden">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Cài đặt</h1>
      </header>

      <div className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Cài đặt tài khoản</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hồ sơ thương hiệu là ngữ cảnh AI dùng cho mọi bài viết — càng rõ ràng, nội dung càng đúng giọng của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Hồ sơ thương hiệu" icon={<Sparkles className="h-4 w-4" />} description="AI đọc phần này trước khi viết" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tên kênh / thương hiệu">
                  <Input value={brand.brandName} onChange={(e) => setBrand({ ...brand, brandName: e.target.value })} placeholder="Linh Review Thật" />
                </Field>
                <Field label="Lĩnh vực">
                  <Input value={brand.industry} onChange={(e) => setBrand({ ...brand, industry: e.target.value })} placeholder="Review tiêu dùng & affiliate" />
                </Field>
              </div>

              <Field label="Khán giả mục tiêu" hint="Độ tuổi, nhu cầu, hành vi mua sắm.">
                <Textarea rows={2} value={brand.targetAudience} onChange={(e) => setBrand({ ...brand, targetAudience: e.target.value })} />
              </Field>

              <Field label="Câu chuyện cá nhân" hint="AI dùng để tạo nội dung thương hiệu cá nhân chân thật.">
                <Textarea rows={3} value={brand.personalStory} onChange={(e) => setBrand({ ...brand, personalStory: e.target.value })} />
              </Field>

              <Field label="Quy tắc thương hiệu" hint="Những điều AI phải luôn tuân thủ.">
                <Textarea
                  rows={3}
                  value={brand.brandRules}
                  onChange={(e) => setBrand({ ...brand, brandRules: e.target.value })}
                  placeholder="Luôn nói cả điểm chưa ưng. Không khẳng định hiệu quả tuyệt đối với sản phẩm sức khỏe."
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Giọng văn mặc định">
                  <Select value={brand.defaultTone} onChange={(e) => setBrand({ ...brand, defaultTone: e.target.value })}>
                    {TONES.map((tone) => (
                      <option key={tone.id} value={tone.id}>
                        {tone.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Nền tảng mặc định">
                  <Select value={brand.defaultPlatform} onChange={(e) => setBrand({ ...brand, defaultPlatform: e.target.value })}>
                    {PLATFORMS.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Hashtag thường dùng" hint="Phân cách bằng dấu phẩy.">
                  <Input value={brand.preferredHashtags} onChange={(e) => setBrand({ ...brand, preferredHashtags: e.target.value })} />
                </Field>
                <Field label="Từ khóa cấm" hint="AI sẽ không dùng những từ này.">
                  <Input
                    value={brand.bannedWords}
                    onChange={(e) => setBrand({ ...brand, bannedWords: e.target.value })}
                    placeholder="chắc chắn khỏi, cam kết 100%"
                  />
                </Field>
              </div>

              <Field label="CTA ưa thích">
                <Textarea rows={2} value={brand.preferredCTA} onChange={(e) => setBrand({ ...brand, preferredCTA: e.target.value })} />
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <Switch
                  checked={brand.dataConsent}
                  onChange={(value) => setBrand({ ...brand, dataConsent: value })}
                  label="Cho phép dùng nội dung của tôi để cải thiện gợi ý cá nhân hóa"
                />
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Nếu tắt, hệ thống vẫn ghi nhận phản hồi thích/không thích để sắp xếp gợi ý, nhưng không lưu nội dung
                  của bạn làm dữ liệu huấn luyện.
                </p>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button onClick={saveBrand} loading={savingBrand}>
                  Lưu hồ sơ thương hiệu
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tài khoản" icon={<UserIcon className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tên hiển thị">
                  <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </Field>
                <Field label="Email" hint="Email đăng nhập không đổi được ở phiên bản này.">
                  <Input value={data?.user.email ?? ""} disabled />
                </Field>
                <Field label="Múi giờ">
                  <Input value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} />
                </Field>
                <Field label="Vai trò">
                  <Input value={data?.user.role === "admin" ? "Quản trị viên" : "Người dùng"} disabled />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={saveProfile} loading={savingProfile}>
                  Lưu thông tin
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Đổi mật khẩu" icon={<KeyRound className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Mật khẩu hiện tại">
                  <Input
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  />
                </Field>
                <Field label="Mật khẩu mới" hint="Tối thiểu 8 ký tự, gồm chữ và số.">
                  <Input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={changePassword} loading={savingPassword}>
                  Đổi mật khẩu
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          {data?.user.role === "admin" ? (
            <Card>
              <CardHeader title="Khu vực quản trị" icon={<ShieldCheck className="h-4 w-4" />} />
              <CardBody className="space-y-2.5">
                <p className="text-[13px] leading-relaxed text-slate-600">
                  Bạn là quản trị viên: có quyền cấu hình nhà cung cấp AI, model, hạn mức và kiểm tra kết nối API.
                </p>
                <Link href="/settings/ai">
                  <Button variant="outline" className="w-full" icon={<Sparkles className="h-4 w-4" />}>
                    Mở AI Settings
                  </Button>
                </Link>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Phiên đăng nhập đang hoạt động" />
            <CardBody className="space-y-2">
              {(data?.sessions ?? []).map((session, index) => (
                <div key={session.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-slate-800">
                      {index === 0 ? "Phiên hiện tại" : "Thiết bị khác"}
                    </span>
                    <Badge tone="neutral">{formatDateTime(session.createdAt)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{session.userAgent ?? "Không rõ thiết bị"}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <AuditTrail />
        </div>
      </div>
    </div>
  );
}

function AuditTrail() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => api.get<AuditEntry[]>("/api/account/audit-log?limit=15"),
  });

  return (
    <Card>
      <CardHeader title="Nhật ký hoạt động" description="Mọi thao tác quan trọng đều được ghi lại" icon={<Eye className="h-4 w-4" />} />
      <CardBody className="space-y-1.5">
        {isLoading ? (
          <SkeletonRows rows={4} />
        ) : data && data.length > 0 ? (
          data.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-slate-700">
                  <span className="font-medium">{entry.action}</span> · {entry.entityType}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {entry.metadata ? JSON.stringify(entry.metadata).slice(0, 60) : "—"}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">{formatDateTime(entry.createdAt)}</span>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-[13px] text-slate-500">Chưa có hoạt động nào.</p>
        )}
      </CardBody>
    </Card>
  );
}
