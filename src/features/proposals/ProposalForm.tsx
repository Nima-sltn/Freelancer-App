import { useState } from "react";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Badge } from "@/components/ui/Badge";
import { useT } from "@/store/i18n";
import {
  MIN_PROPOSAL_DESCRIPTION_LENGTH,
  DURATION_BOUNDS,
  parseNumeric,
} from "@/lib/validators";
import { assessProposalRisk } from "@/entities/proposal/matching";
import type { CreateProposalData, Project } from "@/types";
import useProposalMutations from "./useProposalMutations";
import PriceSimulator from "./PriceSimulator";

interface FormValues {
  description: string;
  price: string;
  duration: string;
}

/**
 * Proposal submission.
 *
 * Before the payload leaves the client it is screened by the same risk engine
 * the admin console uses, so a freelancer is warned about an anomalous bid
 * rather than silently flagged. The price simulator feeds the form fields, which
 * is the kind of cross-domain link (analytics ↔ forms) that makes a product feel
 * coherent.
 */
export function ProposalForm({ project, onClose }: { project: Project; onClose: () => void }) {
  const { t } = useT();
  const { createProposal, isBusy } = useProposalMutations();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      description: "",
      price: String(Math.round(project.budget * 0.85)),
      duration: "30",
    },
  });

  const [riskPreview, setRiskPreview] = useState<{ price: number; duration: number } | null>(null);

  const risk = riskPreview
    ? assessProposalRisk(riskPreview, {
        categoryAverageBudget: project.budget,
        author: (project.owner as never) ?? undefined,
      })
    : null;

  const submit = handleSubmit((values) => {
    const payload: CreateProposalData = {
      projectId: project._id,
      description: values.description.trim(),
      price: parseNumeric(values.price),
      duration: parseNumeric(values.duration),
    };
    void createProposal(payload, {
      onSuccess: onClose,
      projectTitle: project.title,
    });
  });

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <Callout tone="info" title={project.title}>
        {t("field.budget")}: {new Intl.NumberFormat("fa-IR").format(project.budget)}{" "}
        {t("currency.toman")} • {t("projects.proposalCount", { count: project.proposals?.length ?? 0 })}
      </Callout>

      <PriceSimulator
        budget={project.budget}
        competitorCount={project.proposals?.length ?? 0}
        onChange={({ price, duration }) => {
          setValue("price", String(price), { shouldDirty: true });
          setValue("duration", String(duration), { shouldDirty: true });
          setRiskPreview({ price, duration });
        }}
      />

      <TextField<FormValues>
        name="description"
        label={t("field.description")}
        register={register}
        errors={errors}
        required
        multiline
        rows={4}
        rules={{
          required: t("validation.required"),
          minLength: {
            value: MIN_PROPOSAL_DESCRIPTION_LENGTH,
            message: t("validation.description.min", { min: MIN_PROPOSAL_DESCRIPTION_LENGTH }),
          },
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField<FormValues>
          name="price"
          label={t("field.price")}
          register={register}
          errors={errors}
          required
          inputMode="numeric"
          rules={{
            required: t("validation.required"),
            validate: (value) => parseNumeric(String(value)) > 0 || t("validation.price.positive"),
          }}
        />
        <TextField<FormValues>
          name="duration"
          label={t("field.duration")}
          register={register}
          errors={errors}
          required
          inputMode="numeric"
          hint={`${DURATION_BOUNDS.min} – ${DURATION_BOUNDS.max} ${t("common.days")}`}
          rules={{
            required: t("validation.required"),
            validate: (value) => {
              const duration = parseNumeric(String(value));
              return (
                (duration >= DURATION_BOUNDS.min && duration <= DURATION_BOUNDS.max) ||
                t("validation.duration.range", { min: DURATION_BOUNDS.min, max: DURATION_BOUNDS.max })
              );
            },
          }}
        />
      </div>

      {risk && risk.flags.length > 0 ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-ink">
            <Badge tone="warning">{t("trust.review")}</Badge>
            <span>{t("trust.title")}</span>
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-6 text-ink-soft">
            {risk.flags.map((flag) => (
              <li key={flag.key}>• {t(flag.labelKey)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" isLoading={isBusy}>
          {t("proposals.create")}
        </Button>
      </div>
    </form>
  );
}

export default ProposalForm;
