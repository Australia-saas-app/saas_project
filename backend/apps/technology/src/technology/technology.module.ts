import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { TechnologyController } from './technology.controller';
import { ProjectController } from './project.controller';
import { TechnicalServiceService } from './services/technical-service.service';
import { TechnicalCategoryService } from './services/technical-category.service';
import { ProjectService } from './services/project.service';
import { TaskService } from './services/task.service';
import { MessageService } from './services/message.service';
import { TechnicalService } from './entities/technical-service.entity';
import { TechnicalCategory } from './entities/technical-category.entity';
import { Project } from './entities/project.entity';
import { ProjectParticipant } from './entities/project-participant.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectMessage } from './entities/project-message.entity';
import { ProjectProposal } from './entities/project-proposal.entity';
import {
  ProjectMessageModel,
  ProjectMessageSchema,
} from './schemas/project-message.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TechnicalService,
      TechnicalCategory,
      Project,
      ProjectParticipant,
      ProjectTask,
      ProjectMessage,
      ProjectProposal,
    ]),
    MongooseModule.forFeature([
      { name: ProjectMessageModel.name, schema: ProjectMessageSchema },
    ]),
  ],
  controllers: [TechnologyController, ProjectController],
  providers: [
    TechnicalServiceService,
    TechnicalCategoryService,
    ProjectService,
    TaskService,
    MessageService,
  ],
  exports: [
    TechnicalServiceService,
    TechnicalCategoryService,
    ProjectService,
    TaskService,
    MessageService,
  ],
})
export class TechnologyModule {}
