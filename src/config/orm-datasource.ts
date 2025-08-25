import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseConfig } from './database/database.config';
import { buildTypeOrmOptions } from './database/typeorm.config';

// Build using process.env directly, mirroring ConfigModule validation defaults
const db = databaseConfig();
const options = buildTypeOrmOptions(db as any);

export default new DataSource({ ...(options as any) });
