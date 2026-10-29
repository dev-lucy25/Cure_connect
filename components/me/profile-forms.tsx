"use client";

import { useActionState, useState } from "react";
import { becomeProfessor, saveProfile } from "@/server/profile-actions";
import type { CurrentUser } from "@/server/auth";
import type { OrgOption } from "@/server/org-repo";
import type { ProfileField } from "@/lib/validation/auth";
import type { FormState } from "@/lib/validation/form";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import SelectField from "@/components/ui/select-field";

type State = FormState<ProfileField>;

export function ProfileForm({ user, orgs }: { user: CurrentUser; orgs: OrgOption[] }) {
  const [state, action, pending] = useActionState<State, FormData>(saveProfile, {});
  const professor = user.role === "professor";
  const [orgId, setOrgId] = useState(user.orgId ?? "");
  const errors = state.fieldErrors ?? {};
  // 실패하면 서버가 돌려준 입력값으로, 아니면 저장된 값으로 채운다
  const v = (field: ProfileField, saved: string | number | null) => state.values?.[field] ?? (saved === null ? "" : String(saved));

  return (
    <form action={action} noValidate className="space-y-4">
      <Field name="name" label="이름" autoComplete="name" defaultValue={v("name", user.name)} error={errors.name} />

      {professor ? (
        <div>
          <p className="mb-1.5 text-body-sm font-bold text-ink">소속 학교</p>
          <p className="rounded-control bg-subtle px-4 py-3 text-body text-ink">{user.orgName ?? "학교 미연결"}</p>
        </div>
      ) : (
        <SelectField name="orgId" label="소속 학교 / 기관" value={orgId} onChange={(e) => setOrgId(e.target.value)} error={errors.orgId}>
          <option value="">학교 없이 개인으로 사용</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.shortName})
            </option>
          ))}
        </SelectField>
      )}

      {(professor || orgId) && (
        <Field
          name="memberNo"
          label={professor ? "교번" : "학번"}
          autoComplete="username"
          defaultValue={v("memberNo", user.memberNo)}
          error={errors.memberNo}
        />
      )}

      {professor ? (
        <Field name="staffTitle" label="직책 (선택)" placeholder="예: 실습과장, 조교" defaultValue={v("staffTitle", user.staffTitle)} error={errors.staffTitle} />
      ) : (
        orgId && (
          <div className="grid grid-cols-2 gap-3">
            <SelectField name="grade" label="학년" defaultValue={v("grade", user.grade)} error={errors.grade}>
              <option value="">선택</option>
              {[1, 2, 3, 4].map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </SelectField>
            <Field name="classGroup" label="반 (선택)" placeholder="예: B" defaultValue={v("classGroup", user.classGroup)} error={errors.classGroup} />
          </div>
        )
      )}

      {!professor && (
        <Field
          name="roomCode"
          label="실습반 방 코드 (선택)"
          placeholder="교수님께 받은 코드 · 예: DIT-2026"
          autoCapitalize="characters"
          defaultValue={v("roomCode", user.roomCode)}
          error={errors.roomCode}
        />
      )}
      <FormStatus message={state.message} savedAt={state.savedAt} />
      <Button type="submit" block disabled={pending}>
        {pending ? "저장 중..." : "저장하기"}
      </Button>
    </form>
  );
}

export function ProfessorUpgradeForm({ orgs }: { orgs: OrgOption[] }) {
  const [state, action, pending] = useActionState<State, FormData>(becomeProfessor, {});
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      <SelectField name="orgId" id="upgrade-orgId" label="소속 학교" defaultValue={values.orgId ?? ""} error={errors.orgId}>
        <option value="">학교를 골라 주세요</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.shortName})
          </option>
        ))}
      </SelectField>
      <Field name="memberNo" id="upgrade-memberNo" label="교번" defaultValue={values.memberNo} error={errors.memberNo} />
      <Field name="staffTitle" id="upgrade-staffTitle" label="직책 (선택)" placeholder="예: 실습과장, 조교" defaultValue={values.staffTitle} error={errors.staffTitle} />
      <Field
        name="inviteCode"
        id="upgrade-inviteCode"
        label="학교 초대 코드"
        autoComplete="off"
        autoCapitalize="characters"
        defaultValue={values.inviteCode}
        error={errors.inviteCode}
      />
      <FormStatus message={state.message} />
      <Button type="submit" variant="secondary" block disabled={pending}>
        {pending ? "확인 중..." : "교수·조교로 인증하기"}
      </Button>
    </form>
  );
}
