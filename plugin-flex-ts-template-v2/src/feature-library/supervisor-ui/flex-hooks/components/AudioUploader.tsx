import React, { useRef } from 'react';
import { Box } from '@twilio-paste/core/box';
import { HelpText } from '@twilio-paste/core/help-text';
import { FilePond, registerPlugin } from 'react-filepond';
import type { FilePondFile, ActualFileObject, ProcessServerConfigFunction } from 'filepond';
import FilePondPluginFileEncode from 'filepond-plugin-file-encode';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

import 'filepond/dist/filepond.min.css';
import './custom-filepond.css';

// Register FilePond plugins
registerPlugin(FilePondPluginFileEncode, FilePondPluginFileValidateType);

interface AudioFileUploadProps {
  files: File[];
  setFiles: (files: File[]) => void;
  fileUploadError: string | null;
  handleProcessFile: any;
  triggerRefresh: () => void;
}

const createProcessFn = (handleProcessFile: any): ProcessServerConfigFunction => {
  let abortController: AbortController | null = null;

  return async (
    fieldName: string,
    file: ActualFileObject,
    metadata: any,
    load: (p: string | { [key: string]: any }) => void,
    error: (error: string) => void,
    progress: (isLengthComputable: boolean, loaded: number, total: number) => void,
    abort: () => void,
  ) => {
    abortController = new AbortController();

    try {
      await handleProcessFile(
        fieldName,
        file,
        metadata,
        load,
        error,
        (percentage: number) => progress(true, percentage, 100),
        () => abortController?.abort(),
      );

      return {
        abort: () => {
          abortController?.abort();
          abort();
        },
      };
    } catch (err) {
      error((err as Error).message);
      return { abort: () => abort() };
    }
  };
};

export const AudioFileUpload = ({
  files,
  setFiles,
  fileUploadError,
  handleProcessFile,
  triggerRefresh,
}: AudioFileUploadProps) => {
  const pondRef = useRef<FilePond | null>(null);

  const handleUpdateFiles = (fileItems: FilePondFile[]) => {
    setFiles(fileItems.map((fileItem) => fileItem.file as File));
  };

  return (
    <Box>
      <FilePond
        ref={pondRef}
        files={files}
        allowMultiple={true}
        maxFiles={3}
        onupdatefiles={handleUpdateFiles}
        name="files"
        instantUpload={true}
        allowRevert={true}
        forceRevert={true}
        labelIdle='Drag & Drop your audio file or <span class="filepond--label-action">Browse</span>'
        labelFileProcessingError={fileUploadError || 'Error during upload'}
        labelFileProcessingComplete="Upload successful!"
        labelFileProcessing="Uploading..."
        labelFileProcessingAborted="Upload canceled"
        credits={false}
        acceptedFileTypes={['audio/mpeg', 'audio/wav']}
        server={{
          process: createProcessFn(handleProcessFile),
          revert: null,
          load: null,
          restore: null,
        }}
        onprocessfile={(error, file) => {
          if (!error) {
            setTimeout(() => {
              pondRef.current?.removeFile(file.id);
              setFiles([]); // Clear React files state
            }, 8000);

            triggerRefresh(); // Trigger dropdown refresh
          }
        }}
      />
      <HelpText id="file-upload">
        Upload audio files (MP3 or WAV) by dragging them here or clicking to browse. Maximum file size: 5MB.
      </HelpText>
    </Box>
  );
};
