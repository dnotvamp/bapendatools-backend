import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';

@Injectable()
export class AppService {
  runYolo() {
    exec('python autocrop_folder.py', (err, stdout, stderr) => {
      if (err) {
        console.error(err);
      }
      console.log(stdout);
    });

    return {
      message: 'YOLO processing started',
    };
  }
}
