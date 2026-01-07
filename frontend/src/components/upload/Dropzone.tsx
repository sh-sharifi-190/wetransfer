import { Button, Center, createStyles, Group, Text } from "@mantine/core";
import { Dropzone as MantineDropzone } from "@mantine/dropzone";
import { ForwardedRef, useRef } from "react";
import { TbCloudUpload, TbUpload } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import useTranslate from "../../hooks/useTranslate.hook";
import { FileUpload } from "../../types/File.type";
import { byteToHumanSizeString } from "../../utils/fileSize.util";
import toast from "../../utils/toast.util";

const useStyles = createStyles((theme) => ({
  wrapper: {
    position: "relative",
    marginBottom: 30,
  },

  dropzone: {
    borderWidth: 1,
    paddingBottom: 50,
  },

  icon: {
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[3]
        : theme.colors.gray[4],
  },

  control: {
    position: "absolute",
    bottom: -20,
  },
}));

const Dropzone = ({
  title,
  isUploading,
  maxShareSize,
  onFilesChanged,
}: {
  title?: string;
  isUploading: boolean;
  maxShareSize: number;
  onFilesChanged: (files: FileUpload[]) => void;
}) => {
  const t = useTranslate();

  const { classes } = useStyles();
  const openRef = useRef<() => void>();
  return (
    <div className={classes.wrapper}>
      <MantineDropzone
        onReject={(e) => {
          toast.error(e[0].errors[0].message);
        }}
        disabled={isUploading}
        openRef={openRef as ForwardedRef<() => void>}
        onDrop={(files: FileUpload[]) => {
          const fileSizeSum = files.reduce((n, { size }) => n + size, 0);

          // Fallback if maxShareSize is missing (prevents logic errors)
          const limit = maxShareSize || 1000000000; 

          if (fileSizeSum > limit) {
            toast.error(
              t("upload.dropzone.notify.file-too-big", {
                maxSize: byteToHumanSizeString(limit),
              }),
            );
          } else {
            files = files.map((newFile) => {
              newFile.uploadingProgress = 0;
              return newFile;
            });
            onFilesChanged(files);
          }
        }}
        className={classes.dropzone}
        radius="md"
      >
        <div style={{ pointerEvents: "none" }}>
          <Group position="center">
            {/* Increased icon size slightly for better look */}
            <TbCloudUpload size={60} className={classes.icon} />
          </Group>
          
          {/* --- CHANGED: Hardcoded Title --- */}
          <Text align="center" weight={700} size="lg" mt="xl">
            {title || "Upload Assignment"}
          </Text>
          
          {/* --- CHANGED: Hardcoded Description (Fixes NaN error) --- */}
          <Text align="center" size="sm" mt="xs" color="dimmed">
            Drag and drop your files here. Max size: 1GB.
          </Text>
        </div>
      </MantineDropzone>
      <Center>
        <Button
          className={classes.control}
          variant="filled" // Changed to filled to make it pop more
          size="sm"
          radius="xl"
          disabled={isUploading}
          onClick={() => openRef.current && openRef.current()}
        >
          {/* Added text next to the icon */}
          <TbUpload size={18} style={{ marginRight: 5 }} /> Select Files
        </Button>
      </Center>
    </div>
  );
};
export default Dropzone;