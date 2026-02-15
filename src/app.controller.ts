import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import archiver from 'archiver';
import { spawn } from 'child_process';
import * as path from 'path';
import type { Response } from 'express';

@Controller()
export class AppController {
  private findScript(...candidates: (string | undefined)[]) {
    const checked: string[] = [];
    for (const c of candidates) {
      if (!c) continue;
      checked.push(c);
      if (fs.existsSync(c)) return { path: c, checked };
    }
    return { path: null, checked };
  }

private getPythonExecutable() {
  return process.env.PYTHON_EXECUTABLE || 'python3';
}

  // Endpoint 1: AutoCrop
  @Post('AutoCrop')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        zipFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('zipFile', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_, file, cb) => {
          const safe = file.originalname.replace(/\s+/g, '_');
          const name = `${Date.now()}-${Math.round(Math.random() * 10000)}-${safe}`;
          cb(null, name);
        },
      }),
    }),
  )
  async uploadZip(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const uploadedPath = path.join(uploadsDir, file.filename);

      const uniqueId = `${path.parse(file.filename).name}-${Date.now()}`;
      const extractDir = path.join(uploadsDir, 'extracted', uniqueId);
      const outputDir = path.join(process.cwd(), 'output', uniqueId);

      // buat & bersihkan direktori
      for (const d of [extractDir, outputDir]) {
        if (fs.existsSync(d)) await fsPromises.rm(d, { recursive: true, force: true });
        await fsPromises.mkdir(d, { recursive: true });
      }

      if (!fs.existsSync(uploadedPath)) {
        return res.status(HttpStatus.BAD_REQUEST).send('Uploaded file not found on server');
      }

      const candidates = [
        process.env.PYTHON_SCRIPT_PATH,
        path.join(process.cwd(), 'autocrop_folder.py'),
        path.join(process.cwd(), 'src', 'autocrop_folder.py'),
        path.join(__dirname, '..', 'autocrop_folder.py'),
        path.join(process.cwd(), 'autocrop.py'),
        path.join(process.cwd(), 'src', 'autocrop.py'),
      ].filter(Boolean) as string[];

      const found = this.findScript(...candidates);
      if (!found.path) {
        console.error('autocrop script not found. Searched:', found.checked);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send('autocrop script not found. Set PYTHON_SCRIPT_PATH or place autocrop_folder.py in project root or src/');
      }

      const scriptPath = found.path;
      console.log('Running autocrop script at:', scriptPath);

      const pythonExec = this.getPythonExecutable();

      // jalankan python tanpa shell agar path dengan spasi diparsing benar
      await new Promise<void>((resolve, reject) => {
        const child = spawn(pythonExec, [scriptPath, uploadedPath, extractDir, outputDir], {
          cwd: process.cwd(),
          env: { ...process.env },
          shell: false,
        });

        child.stdout.on('data', (d) => console.log('[autocrop stdout]', d.toString()));
        child.stderr.on('data', (d) => console.error('[autocrop stderr]', d.toString()));

        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
          if (code === 0) return resolve();
          return reject(new Error(`autocrop exited with code ${code}`));
        });
      });

      // zip hasil outputDir
      const zipOutDir = path.join(process.cwd(), 'output');
      await fsPromises.mkdir(zipOutDir, { recursive: true });
      const zipOutPath = path.join(zipOutDir, `${uniqueId}.zip`);
      if (fs.existsSync(zipOutPath)) await fsPromises.unlink(zipOutPath);

      const output = fs.createWriteStream(zipOutPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => { throw err; });
      archive.pipe(output);
      archive.directory(outputDir, false);
      await archive.finalize();

      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', (err) => reject(err));
      });

      // optional: hapus uploaded zip agar storage tidak penuh
      try { await fsPromises.unlink(uploadedPath); } catch {}

      res.setHeader('Cache-Control', 'no-store');
      return res.download(zipOutPath, 'output.zip', (err) => {
        if (err) {
          console.error('Download error:', err);
          try { res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to send file'); } catch {}
        }
      });
    } catch (err) {
      console.error('Error in /AutoCrop:', err);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(String(err));
    }
  }

  // Endpoint 2: images-to-word
  @Post('images-to-word')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        zipFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('zipFile', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_, file, cb) => {
          const safe = file.originalname.replace(/\s+/g, '_');
          const name = `${Date.now()}-${Math.round(Math.random() * 10000)}-${safe}`;
          cb(null, name);
        },
      }),
    }),
  )
  async imagesToWord(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const uploadedPath = path.join(uploadsDir, file.filename);
    const uniqueId = `${path.parse(file.filename).name}-${Date.now()}`;
    const outputDir = path.join(process.cwd(), 'output', uniqueId);

    if (!fs.existsSync(uploadedPath)) {
      return res.status(HttpStatus.BAD_REQUEST).send('Uploaded file not found on server');
    }

    if (!fs.existsSync(outputDir)) {
      await fsPromises.mkdir(outputDir, { recursive: true });
    }

    const candidates = [
      process.env.PYTHON_SCRIPT_IMG2WORD,
      path.join(process.cwd(), 'imgestoword.py'),
      path.join(process.cwd(), 'src', 'imgestoword.py'),
      path.join(__dirname, '..', 'imgestoword.py'),
    ].filter(Boolean) as string[];

    const found = this.findScript(...candidates);
    if (!found.path) {
      console.error('imgestoword.py not found. Searched:', found.checked);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('imgestoword.py not found. Set PYTHON_SCRIPT_IMG2WORD or place imgestoword.py in project root or src/');
    }

    const scriptPath = found.path;
    console.log('Running imgestoword script at:', scriptPath);

    const pythonExec = this.getPythonExecutable();

    // Execute Python script dengan timeout
    await new Promise<void>((resolve, reject) => {
      const child = spawn(pythonExec, [scriptPath, uploadedPath, outputDir], {
        cwd: process.cwd(),
        env: { ...process.env },
        shell: false,
        timeout: 120000, // 2 menit timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        const output = d.toString();
        stdout += output;
        console.log('[imgestoword stdout]', output);
      });

      child.stderr.on('data', (d) => {
        const output = d.toString();
        stderr += output;
        console.error('[imgestoword stderr]', output);
      });

      child.on('error', (err) => {
        console.error('Process error:', err);
        reject(err);
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('Python script completed successfully');
          return resolve();
        }
        console.error(`Python script exited with code ${code}. stderr: ${stderr}`);
        return reject(new Error(`imgestoword exited with code ${code}: ${stderr}`));
      });
    });

    const filePath = path.join(outputDir, 'output.docx');

    // Cek file dengan retry (max 5 kali, interval 500ms)
    let fileExists = false;
    for (let i = 0; i < 5; i++) {
      if (fs.existsSync(filePath)) {
        fileExists = true;
        break;
      }
      console.log(`File not found, retry ${i + 1}/5...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!fileExists) {
      console.error('Output DOCX not found at:', filePath);
      console.error('Directory contents:', fs.readdirSync(outputDir));
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Output DOCX not generated');
    }

    // Verifikasi file size
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Output DOCX is empty');
    }

    console.log('Sending file:', filePath, 'Size:', stats.size);

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    return res.download(filePath, 'output.docx', (err) => {
      if (err) {
        console.error('Download error:', err);
      } else {
        console.log('File downloaded successfully');
        // Optional: hapus file setelah download
        // fsPromises.unlink(filePath).catch(e => console.error('Cleanup error:', e));
      }
    });
  } catch (err) {
    console.error('Error in /images-to-word:', err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(String(err));
  }
}

  // Endpoint 3: AutofileSorter
@Post('AutofileSorter')
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      zipFile: { type: 'string', format: 'binary' },
    },
  },
})
@UseInterceptors(
  FileInterceptor('zipFile', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_, file, cb) => {
        const safe = file.originalname.replace(/\s+/g, '_');
        const name = `${Date.now()}-${Math.round(Math.random() * 10000)}-${safe}`;
        cb(null, name);
      },
    }),
  }),
)
async organizeImages(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const uploadedPath = path.join(uploadsDir, file.filename);
    const uniqueId = `${path.parse(file.filename).name}-${Date.now()}`;
    const extractDir = path.join(uploadsDir, 'extracted', uniqueId);
    const outputDir = path.join(process.cwd(), 'output', uniqueId);

    console.log('=== STEP 1: Setup directories ===');
    console.log('Uploaded path:', uploadedPath);
    console.log('Extract dir:', extractDir);
    console.log('Output dir:', outputDir);

    // Setup directories
    for (const d of [extractDir, outputDir]) {
      if (fs.existsSync(d)) {
        await fsPromises.rm(d, { recursive: true, force: true });
      }
      await fsPromises.mkdir(d, { recursive: true });
    }

    if (!fs.existsSync(uploadedPath)) {
      return res.status(HttpStatus.BAD_REQUEST).send('Uploaded file not found on server');
    }

    console.log('✓ Directories created');
    console.log('✓ Uploaded file exists:', fs.statSync(uploadedPath).size, 'bytes');

    // Find Python script
    const candidates = [
      process.env.PYTHON_SCRIPT_ORGANIZE,
      path.join(process.cwd(), 'organize_images.py'),
      path.join(process.cwd(), 'src', 'organize_images.py'),
      path.join(__dirname, '..', 'organize_images.py'),
    ].filter(Boolean) as string[];

    const found = this.findScript(...candidates);
    if (!found.path) {
      console.error('organize_images.py not found. Searched:', found.checked);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('organize_images.py not found');
    }

    const scriptPath = found.path;
    console.log('=== STEP 2: Run Python script ===');
    console.log('Script path:', scriptPath);

    const pythonExec = this.getPythonExecutable();
    console.log('Python executable:', pythonExec);

    // Execute Python script dengan better error handling
    let pythonStdout = '';
    let pythonStderr = '';

    await new Promise<void>((resolve, reject) => {
      const child = spawn(pythonExec, [scriptPath, uploadedPath, extractDir, outputDir], {
        cwd: process.cwd(),
        env: { ...process.env },
        shell: false,
        timeout: 120000,
      });

      child.stdout.on('data', (d) => {
        const data = d.toString();
        pythonStdout += data;
        console.log('[Python stdout]', data);
      });

      child.stderr.on('data', (d) => {
        const data = d.toString();
        pythonStderr += data;
        console.error('[Python stderr]', data);
      });

      child.on('error', (err) => {
        console.error('Process spawn error:', err);
        reject(err);
      });

      child.on('close', (code) => {
        console.log(`Python script exited with code: ${code}`);
        if (code === 0) return resolve();
        const errorMsg = `Python script failed with code ${code}. Stderr: ${pythonStderr}`;
        console.error(errorMsg);
        return reject(new Error(errorMsg));
      });
    });

    console.log('✓ Python script completed');

    // =======================
    // VALIDASI OUTPUT
    // =======================
    console.log('=== STEP 3: Validate output ===');

    if (!fs.existsSync(outputDir)) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Output directory not created by script');
    }

    // Cek isi directory
    const dirContents = fs.readdirSync(outputDir, { recursive: true });
    console.log('Output directory contents:');
    dirContents.forEach(item => console.log(`  - ${item}`));

    if (dirContents.length === 0) {
      console.error('ERROR: Output directory is empty!');
      console.log('Python stdout:', pythonStdout);
      console.log('Python stderr:', pythonStderr);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Output directory is empty. Check Python script output');
    }

    console.log(`✓ Found ${dirContents.length} items in output`);

    // =======================
    // BUAT ZIP
    // =======================
    console.log('=== STEP 4: Create ZIP archive ===');

    const zipOutDir = path.join(process.cwd(), 'output');
    await fsPromises.mkdir(zipOutDir, { recursive: true });
    const zipOutPath = path.join(zipOutDir, `${uniqueId}-organized.zip`);

    if (fs.existsSync(zipOutPath)) {
      await fsPromises.unlink(zipOutPath);
    }

    const output = fs.createWriteStream(zipOutPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    let zipSize = 0;

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    archive.on('data', (data) => {
      zipSize += data.length;
    });

    archive.pipe(output);

    // Add files dari outputDir
    console.log('Adding files to ZIP from:', outputDir);
    archive.directory(outputDir, false);

    await archive.finalize();

    await new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        console.log(`✓ ZIP created: ${zipOutPath} (${zipSize} bytes)`);
        resolve();
      });
      output.on('error', (err) => {
        console.error('Write stream error:', err);
        reject(err);
      });
    });

    // Verify ZIP file exists and has content
    if (!fs.existsSync(zipOutPath)) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('ZIP file creation failed');
    }

    const zipStats = fs.statSync(zipOutPath);
    console.log(`✓ ZIP file verified: ${zipStats.size} bytes`);

    if (zipStats.size === 0) {
      console.error('ERROR: ZIP file is empty!');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('ZIP file is empty. Check Python script output');
    }

    // =======================
    // CLEANUP
    // =======================
    console.log('=== STEP 5: Cleanup ===');

    try {
      await fsPromises.unlink(uploadedPath);
      console.log('✓ Uploaded file deleted');
    } catch (e) {
      console.warn('Could not delete uploaded file:', e);
    }

    // =======================
    // SEND RESPONSE
    // =======================
    console.log('=== STEP 6: Send ZIP to client ===');

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="organized.zip"');

    return res.download(zipOutPath, 'organized.zip', (err) => {
      if (err) {
        console.error('Download error:', err);
      } else {
        console.log('✓ File downloaded successfully');
        // Optional: hapus setelah download selesai
        setTimeout(() => {
          try {
            fsPromises.rm(path.dirname(zipOutPath), { recursive: true, force: true });
          } catch (e) {
            console.warn('Cleanup error:', e);
          }
        }, 5000);
      }
    });

  } catch (err) {
    console.error('=== ERROR in /AutofileSorter ===');
    console.error(err);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(String(err));
  }
}
}