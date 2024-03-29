import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { Room } from './room.model';
import { RoomService } from './rooms.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwtAuth.guard';

@Resolver(() => Room)
export class RoomResolver {
  constructor(
    private readonly roomsService: RoomService,
  ) {}

  @Query(() => [Room])
  @UseGuards(JwtAuthGuard)
  async rooms(): Promise<Room[]> {
    return this.roomsService.findAll();
  }

  @Query(() => Room)
  async room(@Args('id', { type: () => ID }) id: string): Promise<Room> {
    return this.roomsService.findOne(id);
  }

  @Query(() => Room)
  @UseGuards(JwtAuthGuard)
  async roomToUser(
    @Context() context,
    @Args('to', { type: () => ID}) id: string): Promise<Room> {
    const userIds = [context.req.user.id, id];
    const existingRoom = await this.roomsService.findOneByUsers(userIds);
    if (!existingRoom) {
      throw new Error('Room not found');
    }
    return existingRoom;
  }
  
  @Mutation(() => Room)
  @UseGuards(JwtAuthGuard)
  async createRoom(
    @Context() context, 
    @Args('recipientId', { type: () => ID }) recipientId: string): Promise<Room> {
    const initiatorId = context.req.user.id;

    return this.roomsService.create([initiatorId, recipientId]);
  }
}