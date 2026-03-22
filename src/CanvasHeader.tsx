import { HamburgerIcon } from '@chakra-ui/icons';
import {
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  Stack,
  Text,
} from '@chakra-ui/react';
import React from 'react';
import { Logo } from './Logo';
import { useSourceActor } from './sourceMachine';

export const CanvasHeader: React.FC = () => {
  const [sourceState] = useSourceActor();

  const registryData = sourceState.context.sourceRegistryData;
  return (
    <HStack zIndex={1} justifyContent="space-between" height="3rem">
      <Logo
        fill="white"
        style={{
          // @ts-ignore
          '--fill': 'white',
          height: '100%',
          padding: '0 .5rem',
        }}
        aria-label="Stately"
      />
      {registryData && (
        <Stack direction="row" spacing="4" alignItems="center" pr="4">
          <Text fontWeight="semibold" fontSize="sm" color="gray.100">
            {registryData?.project?.name || 'Unnamed Source'}
          </Text>
          <HStack>
            <Menu closeOnSelect>
              <MenuButton
                as={IconButton}
                aria-label="Menu"
                icon={<HamburgerIcon />}
                size="sm"
              />
              <MenuList>
              </MenuList>
            </Menu>
          </HStack>
        </Stack>
      )}
    </HStack>
  );
};
