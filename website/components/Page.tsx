import { Stack, Columns, Column, Box, Text } from './Design';
import Link from 'next/link';
import Head from 'next/head';

export function Page(props: {
  title: string;
  children: React.ReactNode | React.ReactNode[];
}) {
  return (
    <>
      <Head>
        <title>{props.title}</title>
      </Head>
      <Stack spacing="small">
        <Columns spacing="none">
          <Column flex={1}>
            <Box padding="small">
              <Text style="code">cmd-ts</Text>
            </Box>
          </Column>
          <Column flex={1}>
            <Box padding="small">
              <Text align="right">
                <Link href="/docs">
                  <a>Docs</a>
                </Link>
              </Text>
            </Box>
          </Column>
        </Columns>
        {props.children}
      </Stack>
    </>
  );
}
