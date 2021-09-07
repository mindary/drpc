export const Greeting = {
  name: 'greeting',
  methods: {
    greet: {} as (msg: string) => string,
  },
};

export type GreetingType = typeof Greeting.methods;
