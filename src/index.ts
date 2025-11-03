import {Hono} from 'hono'
import * as fs from "node:fs";
import {BrewfatherBatch, BrewfatherNotification} from "./types";
import axios from "axios";

const app = new Hono()

class Storage {
  getFilePath(batchNumber: number): string {
    return process.cwd() + '/data/' + batchNumber + '.txt';
  }

  getSg(batchNumber: number): number | null {
    try {
      const content = fs.readFileSync(this.getFilePath(batchNumber), 'utf8');

      return parseFloat(content);

    } catch (e) {
      return null;
    }
  }

  saveSg(batchNumber: number, sg: number) {
    fs.writeFileSync(this.getFilePath(batchNumber), sg.toString());
  }
}


class Brewfather {
  getAuthorization() {
    const auth = [
      process.env.BREWFATHER_USERNAME,
      process.env.BREWFATHER_API_KEY,
    ].join(':')

    return Buffer.from(auth).toString('base64')
  }

  getClient() {
    const client = axios.create({
      baseURL: 'https://api.brewfather.app/v2',
      headers: {
        'Authorization': 'Basic ' + this.getAuthorization()
      }
    })

    return client;
  }

  async getCurrentFermentingRecipe(): Promise<BrewfatherBatch> {
    const response = await this.getClient().get<BrewfatherBatch[]>('/batches', {
      params: {
        status: 'Fermenting'
      }
    })

    const batches = response.data;

    if (batches.length !== 1) {
      throw new Error(`Expected 1 batch fermenting, found ${batches.length}`)
    }

    return batches[0];
  }
}

const storage = new Storage();
const brewfather = new Brewfather();

app.post('/', async (c) => {
  const body = await c.req.json<BrewfatherNotification>();
  const currentSg = body.sg;
  const currentRecipe = await brewfather.getCurrentFermentingRecipe();

  const batchNumber = currentRecipe.batchNo;
  const latestSg = storage.getSg(batchNumber);
  if (!latestSg || currentSg < latestSg) {
    await axios.post(process.env.NTFY_URL!,
      `Batch ${currentRecipe.recipe.name} (batch number ${batchNumber}) reached ${currentSg} at ${new Date().toLocaleString()}`,
      {
        headers: {
          'Title': `Batch ${batchNumber} reached ${currentSg}`,
          'Priority': 'min',
          'Tags': 'beers'
        }
      }
    )
    storage.saveSg(batchNumber, currentSg);
  }
  return c.text('good')
})

export default app
