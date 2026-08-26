import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceTaxonomy } from '../entities/service-taxonomy.entity';

@Injectable()
export class ServiceTaxonomyService {
  private readonly logger = new Logger(ServiceTaxonomyService.name);

  constructor(
    @InjectRepository(ServiceTaxonomy)
    private readonly taxonomyRepo: Repository<ServiceTaxonomy>,
  ) {}

  async getTaxonomy(serviceType: string = 'technology') {
    const sType = (serviceType || 'technology').toLowerCase().trim();
    const items = await this.taxonomyRepo.find({
      where: { serviceType: sType, isActive: true },
      order: { createdAt: 'DESC' },
    });

    const categories: string[] = [];
    const subcategories: string[] = [];
    const skills: string[] = [];

    items.forEach((item) => {
      const t = item.type?.toLowerCase();
      if (t === 'category' && !categories.includes(item.name)) {
        categories.push(item.name);
      } else if ((t === 'subcategory' || t === 'sub_category') && !subcategories.includes(item.name)) {
        subcategories.push(item.name);
      } else if (t === 'skill' && !skills.includes(item.name)) {
        skills.push(item.name);
      }
    });

    return {
      serviceType: sType,
      categories,
      subcategories,
      skills,
      raw: items,
    };
  }

  async addItem(data: {
    serviceType?: string;
    type: 'category' | 'subcategory' | 'skill' | string;
    name: string;
    parentCategory?: string;
  }) {
    const sType = (data.serviceType || 'technology').toLowerCase().trim();
    const type = data.type.toLowerCase().trim();
    const name = data.name.trim();

    if (!name) return this.getTaxonomy(sType);

    let existing = await this.taxonomyRepo.findOne({
      where: { serviceType: sType, type, name },
    });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await this.taxonomyRepo.save(existing);
      }
    } else {
      const created = this.taxonomyRepo.create({
        serviceType: sType,
        type,
        name,
        parentCategory: data.parentCategory?.trim() || null,
        isActive: true,
      });
      await this.taxonomyRepo.save(created);
    }

    return this.getTaxonomy(sType);
  }

  async removeItem(data: {
    serviceType?: string;
    type: 'category' | 'subcategory' | 'skill' | string;
    name: string;
  }) {
    const sType = (data.serviceType || 'technology').toLowerCase().trim();
    const type = data.type.toLowerCase().trim();
    const name = data.name.trim();

    await this.taxonomyRepo.delete({
      serviceType: sType,
      type,
      name,
    });

    return this.getTaxonomy(sType);
  }
}
