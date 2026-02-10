import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  accountNumber: string;

  @Column()
  ownerName: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalIncome: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalExpenses: string;

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
