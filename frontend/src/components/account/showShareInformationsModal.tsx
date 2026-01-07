import { Divider, Flex, Progress, Stack, Text } from "@mantine/core";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import moment from "moment";
import { FormattedMessage } from "react-intl";
import { translateOutsideContext } from "../../hooks/useTranslate.hook";
import { MyShare } from "../../types/share.type";
import CopyTextField from "../upload/CopyTextField";

// --- INLINE HELPER: Format Bytes (Prevents Import Errors) ---
const byteToHumanSizeString = (bytes: number) => {
  if (!bytes || bytes === 0 || isNaN(bytes)) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
// ------------------------------------------------------------

const showShareInformationsModal = (
  modals: ModalsContextProps,
  share: MyShare,
  maxShareSize: number,
) => {
  const t = translateOutsideContext();
  const link = `${window.location.origin}/s/${share.id}`;

  // --- FIX: SAFE SIZE CALCULATION ---
  // We calculate the total size from the files array to ensure it's accurate.
  // We also handle cases where 'size' is a string or undefined.
  const currentSize = share.files
    ? share.files.reduce((acc, file) => acc + parseInt(String(file.size)), 0)
    : (share.size ? parseInt(String(share.size)) : 0);

  // Fallback to 100GB if maxShareSize is missing/zero
  const safeMaxSize = maxShareSize || 100000000000;

  const formattedShareSize = byteToHumanSizeString(currentSize);
  const formattedMaxShareSize = byteToHumanSizeString(safeMaxSize);
  const shareSizeProgress = (currentSize / safeMaxSize) * 100;
  // ----------------------------------

  const formattedCreatedAt = moment(share.createdAt).format("LLL");
  const formattedExpiration =
    moment(share.expiration).unix() === 0
      ? "Never"
      : moment(share.expiration).format("LLL");

  return modals.openModal({
    title: t("account.shares.modal.share-informations"),

    children: (
      <Stack align="stretch" spacing="md">
        <Text size="sm">
          <b>
            <FormattedMessage id="account.shares.table.id" />:{" "}
          </b>
          {share.id}
        </Text>
        <Text size="sm">
          <b>
            <FormattedMessage id="account.shares.table.name" />:{" "}
          </b>
          {share.name || "-"}
        </Text>

        <Text size="sm">
          <b>
            <FormattedMessage id="account.shares.table.description" />:{" "}
          </b>
          {share.description || "-"}
        </Text>

        <Text size="sm">
          <b>
            <FormattedMessage id="account.shares.table.createdAt" />:{" "}
          </b>
          {formattedCreatedAt}
        </Text>

        <Text size="sm">
          <b>
            <FormattedMessage id="account.shares.table.expiresAt" />:{" "}
          </b>
          {formattedExpiration}
        </Text>
        <Divider />
        <CopyTextField link={link} />
        <Divider />
        <Text size="sm">
          <b>
            <FormattedMessage id="account.shares.table.size" />:{" "}
          </b>
          {formattedShareSize} / {formattedMaxShareSize} (
          {shareSizeProgress.toFixed(1)}%)
        </Text>

        <Flex align="center" justify="center">
          {currentSize / safeMaxSize < 0.1 && (
            <Text size="xs" style={{ marginRight: "4px" }}>
              {formattedShareSize}
            </Text>
          )}
          <Progress
            value={shareSizeProgress}
            label={currentSize / safeMaxSize >= 0.1 ? formattedShareSize : ""}
            style={{ width: currentSize / safeMaxSize < 0.1 ? "70%" : "80%" }}
            size="xl"
            radius="xl"
          />
          <Text size="xs" style={{ marginLeft: "4px" }}>
            {formattedMaxShareSize}
          </Text>
        </Flex>
      </Stack>
    ),
  });
};

export default showShareInformationsModal;